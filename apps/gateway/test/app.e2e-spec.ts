import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Global, Module } from '@nestjs/common';
import request from 'supertest';
import { of } from 'rxjs';
import { ConfigModule } from '@nestjs/config';

/**
 * Gateway integration tests.
 *
 * Mocks every downstream TCP client and guard so no external services
 * are required.  Tests validate routing, input validation (DTOs + pipes),
 * and HTTP status codes for all gateway endpoints.
 */

/* ------------------------------------------------------------------ */
/*  Mock helpers                                                       */
/* ------------------------------------------------------------------ */

const mockClientProxy = () => ({
  send: jest.fn().mockReturnValue(of({ data: {} })),
  emit: jest.fn().mockReturnValue(of({})),
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn(),
});

const AUTH_CLIENT = mockClientProxy();
const ROBOTS_CLIENT = mockClientProxy();
const ACCOUNTS_CLIENT = mockClientProxy();
const PG_READ_CLIENT = mockClientProxy();

/* ------------------------------------------------------------------ */
/*  Imports                                                            */
/* ------------------------------------------------------------------ */

import { UserGateModule } from '../src/user_gate/user_gate.module';
import { RobotGateModule } from '../src/robot_gate/robot_gate.module';
import { AccountGateModule } from '../src/account_gate/account_gate.module';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { OwnRobotGuard } from '../src/guards/own-robot.guard';
import { LoggerService } from '@app/core';
import { AUTH_SERVICE, ROBOTS_SERVICE, ACCOUNTS_SERVICE, PG_READ_SERVICE } from '@app/messaging';
import { REDIS_CLIENT } from '@app/redis';

/* ------------------------------------------------------------------ */
/*  Global mock LoggerService — needed by ClientTcpService in          */
/*  sub-modules that don't import LoggerModule                         */
/* ------------------------------------------------------------------ */

const loggerStub = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  notice: jest.fn(),
  critical: jest.fn(),
};

@Global()
@Module({
  providers: [{ provide: LoggerService, useValue: loggerStub }],
  exports: [LoggerService],
})
class MockLoggerModule {}

/* ------------------------------------------------------------------ */
/*  Test suite                                                         */
/* ------------------------------------------------------------------ */

describe('Gateway (e2e)', () => {
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
              HTTP_PORT: 4040,
              CORS_ORIGINS: 'http://localhost:3000',
              INTERNAL_RPC_TOKEN: 'test-token',
              AUTH_HTTP_HOST: 'localhost',
              AUTH_HTTP_PORT: 4030,
              AUTH_CLIENT_HOST: 'localhost',
              AUTH_CLIENT_PORT: 30000,
              ROBOTS_CLIENT_HOST: 'localhost',
              ROBOTS_CLIENT_PORT: 30001,
              ACCOUNTS_CLIENT_HOST: 'localhost',
              ACCOUNTS_CLIENT_PORT: 30005,
              PG_READ_CLIENT_HOST: 'localhost',
              PG_READ_CLIENT_PORT: 30007,
              REDIS_HOST: 'localhost',
              REDIS_PORT: 6379,
              REDIS_USER: '',
              REDIS_PASSWORD: '',
            }),
          ],
        }),
        MockLoggerModule,
        UserGateModule,
        RobotGateModule,
        AccountGateModule,
      ],
    })
      .overrideProvider(AUTH_SERVICE)
      .useValue(AUTH_CLIENT)
      .overrideProvider(ROBOTS_SERVICE)
      .useValue(ROBOTS_CLIENT)
      .overrideProvider(ACCOUNTS_SERVICE)
      .useValue(ACCOUNTS_CLIENT)
      .overrideProvider(PG_READ_SERVICE)
      .useValue(PG_READ_CLIENT)
      .overrideProvider(REDIS_CLIENT)
      .useValue({})
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'test-user-id', email: 'test@example.com' };
          return true;
        },
      })
      .overrideGuard(OwnRobotGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /* ------ User gate ------- */

  describe('POST /user', () => {
    it('should create a user with valid data', async () => {
      AUTH_CLIENT.send.mockReturnValueOnce(
        of({ id: 'new-user-id', email: 'user@example.com' }),
      );

      const res = await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'user@example.com', password: 'P@ssw0rd1', notifyByEmail: true });

      expect(res.status).toBe(201);
    });

    it('should reject invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'not-an-email', password: 'P@ssw0rd1', notifyByEmail: true });

      expect(res.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const res = await request(app.getHttpServer())
        .post('/user')
        .send({ email: 'user@example.com', password: '123', notifyByEmail: true });

      expect(res.status).toBe(400);
    });

    it('should reject empty body', async () => {
      const res = await request(app.getHttpServer()).post('/user').send({});

      expect(res.status).toBe(400);
    });
  });

  /* ------ Robot gate ------- */

  describe('GET /robot', () => {
    it('should return paginated robots', async () => {
      PG_READ_CLIENT.send.mockReturnValueOnce(
        of({
          data: [{ id: 'r1', name: 'Bot' }],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      );

      const res = await request(app.getHttpServer()).get('/robot?page=1&limit=20');

      expect(res.status).toBe(200);
    });

    it('should reject limit > 100', async () => {
      const res = await request(app.getHttpServer()).get('/robot?limit=200');

      expect(res.status).toBe(400);
    });

    it('should reject page < 1', async () => {
      const res = await request(app.getHttpServer()).get('/robot?page=0');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /robot/positions', () => {
    it('should return paginated positions', async () => {
      PG_READ_CLIENT.send.mockReturnValueOnce(
        of({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }),
      );

      const res = await request(app.getHttpServer()).get('/robot/positions?page=1&limit=10');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /robot', () => {
    it('should reject empty body', async () => {
      const res = await request(app.getHttpServer()).post('/robot').send({});

      expect(res.status).toBe(400);
    });
  });

  /* ------ Account gate ------- */

  describe('POST /account', () => {
    it('should reject empty body', async () => {
      const res = await request(app.getHttpServer()).post('/account').send({});

      expect(res.status).toBe(400);
    });
  });
});
