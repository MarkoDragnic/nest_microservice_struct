import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';

/**
 * Auth service integration tests.
 *
 * Uses mocked UsersService and in-memory RefreshTokenRepository to test
 * the full login → refresh → logout cookie lifecycle without external
 * dependencies (PostgreSQL, Redis, TCP microservices).
 */

import { AuthHttpController } from '../src/auth.http.controller';
import { AuthService } from '../src/auth.service';
import { LocalStrategy } from '../src/strategies/local.strategy';
import { JwtStrategy } from '../src/strategies/jwt.strategy';
import { RefreshStrategy } from '../src/strategies/refresh.strategy';
import { RefreshTokenRepository } from '../src/refresh-token.repository';
import { GatewayOnlyGuard } from '../src/guards/gateway-only.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UsersService } from '../src/users/users.service';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
const JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-32-chars';

const TEST_USER = { id: 'user-1', email: 'test@example.com', name: 'Test User' };

/* ------------------------------------------------------------------ */
/*  In-memory refresh-token store (mirrors Redis behavior)             */
/* ------------------------------------------------------------------ */

const tokenStore = new Map<string, Set<string>>();

const mockRefreshTokenRepo = {
  save: jest.fn(async (userId: string, tokenId: string) => {
    if (!tokenStore.has(userId)) tokenStore.set(userId, new Set());
    tokenStore.get(userId)!.add(tokenId);
  }),
  delete: jest.fn(async (userId: string, tokenId: string) => {
    tokenStore.get(userId)?.delete(tokenId);
  }),
  exists: jest.fn(async (userId: string, tokenId: string) => {
    return tokenStore.get(userId)?.has(tokenId) ?? false;
  }),
};

/* ------------------------------------------------------------------ */
/*  Mock UsersService (avoids ClientTcpService / LoggerService chain)   */
/* ------------------------------------------------------------------ */

const mockUsersService = {
  verifyUser: jest.fn(),
  getUser: jest.fn(),
  create: jest.fn(),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractCookie(res: request.Response, name: string): string | undefined {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((c: string) => c.startsWith(`${name}=`));
}

/* ------------------------------------------------------------------ */
/*  Test suite                                                         */
/* ------------------------------------------------------------------ */

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              JWT_SECRET,
              JWT_EXPIRATION: 3600,
              JWT_REFRESH_SECRET,
              JWT_REFRESH_EXPIRATION: 604800,
              ALLOWED_GATEWAY_IPS: '',
            }),
          ],
        }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [AuthHttpController],
      providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        RefreshStrategy,
        { provide: UsersService, useValue: mockUsersService },
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepo },
      ],
    })
      .overrideGuard(GatewayOnlyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    tokenStore.clear();
    jest.clearAllMocks();
  });

  /** Login and return raw Set-Cookie headers */
  async function loginAndGetCookies(): Promise<string[]> {
    mockUsersService.verifyUser.mockResolvedValueOnce(TEST_USER);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'ValidPass1!' });
    return res.headers['set-cookie'] as unknown as string[];
  }

  /* ----------- Login ----------- */

  describe('POST /auth/login', () => {
    it('should return 401 without credentials', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({});

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid credentials', async () => {
      mockUsersService.verifyUser.mockRejectedValueOnce(
        new UnauthorizedException('Credentials are not valid'),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1!' });

      expect(res.status).toBe(401);
    });

    it('should return 201 and set cookies with valid credentials', async () => {
      mockUsersService.verifyUser.mockResolvedValueOnce(TEST_USER);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'ValidPass1!' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ ok: true });
      expect(extractCookie(res, 'Authentication')).toBeDefined();
      expect(extractCookie(res, 'Refresh')).toBeDefined();
    });
  });

  /* ----------- Refresh ----------- */

  describe('POST /auth/refresh', () => {
    it('should return 401 without refresh cookie', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh');

      expect(res.status).toBe(401);
    });

    it('should return 200 and rotate tokens with valid refresh cookie', async () => {
      const cookies = await loginAndGetCookies();
      const refreshCookie = cookies.find((c: string) => c.startsWith('Refresh='));

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie!]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(extractCookie(res, 'Authentication')).toBeDefined();
      expect(extractCookie(res, 'Refresh')).toBeDefined();
    });
  });

  /* ----------- Logout ----------- */

  describe('POST /auth/logout', () => {
    it('should return 401 without refresh cookie', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout');

      expect(res.status).toBe(401);
    });

    it('should return 200 and clear cookies', async () => {
      const cookies = await loginAndGetCookies();
      const refreshCookie = cookies.find((c: string) => c.startsWith('Refresh='));

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [refreshCookie!]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should reject refresh after logout (token revoked)', async () => {
      const cookies = await loginAndGetCookies();
      const refreshCookie = cookies.find((c: string) => c.startsWith('Refresh='));

      // Logout → revokes the refresh token
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [refreshCookie!]);

      // Attempt refresh with the now-revoked token
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie!]);

      expect(res.status).toBe(401);
    });
  });
});
