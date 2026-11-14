import { INestMicroservice } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CustomTransportStrategy, MicroserviceOptions, Server } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { lastValueFrom } from 'rxjs';
import { TCP_EVENTS } from '@app/contracts';
import { AuthTcpController } from './auth.tcp.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersService } from './users/users.service';

const JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
const INTERNAL_RPC_TOKEN = 'test-internal-rpc-token';

// What pg_read answers for a user lookup. Dates arrive as strings over TCP.
const storedUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'user@example.com',
  roles: ['admin'],
  notifyByEmail: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  isActive: true,
  ...overrides,
});

// Stands in for the TCP socket. It runs the handler Nest registered for the pattern,
// so the guards and the exception filter of the controller run around it as they do in the service.
class InMemoryServer extends Server implements CustomTransportStrategy {
  listen(callback: () => void) {
    callback();
  }

  close() {}

  on() {}

  unwrap<T>(): T {
    return undefined as T;
  }

  async request(pattern: string, data: unknown): Promise<unknown> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) throw new Error(`No handler registered for ${pattern}`);
    return lastValueFrom(this.transformToObservable(await handler(data, {})));
  }
}

describe('AuthTcpController', () => {
  let app: INestMicroservice;
  let server: InMemoryServer;
  let jwtService: JwtService;

  const usersService = { getUser: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET, INTERNAL_RPC_TOKEN })],
        }),
        JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: 3600 } }),
      ],
      controllers: [AuthTcpController],
      providers: [JwtStrategy, { provide: UsersService, useValue: usersService }],
    }).compile();

    server = new InMemoryServer();
    app = moduleRef.createNestMicroservice<MicroserviceOptions>({ strategy: server });
    await app.init();

    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    usersService.getUser.mockReset();
  });

  const tokenFor = (userId: string) => jwtService.sign({ userId });

  // The message gateway's JwtAuthGuard sends: the access token from the cookie, wrapped with the service token.
  const authenticate = (accessToken: string) =>
    server.request(TCP_EVENTS.AUTHENTICATE, {
      payload: { Authentication: accessToken },
      serviceToken: INTERNAL_RPC_TOKEN,
    });

  it('answers a valid token with the user id and nothing else', async () => {
    usersService.getUser.mockResolvedValue(storedUser());

    expect(await authenticate(tokenFor('user-1'))).toEqual({ id: 'user-1' });
  });

  it('does not authenticate the token of an inactive user', async () => {
    usersService.getUser.mockResolvedValue(storedUser({ isActive: false }));

    const answer = await authenticate(tokenFor('user-1'));

    expect(answer).toMatchObject({ error: true, statusCode: 401, data: null });
    expect(JSON.stringify(answer)).not.toContain('user-1');
  });

  it('does not authenticate a user whose record carries no active flag', async () => {
    usersService.getUser.mockResolvedValue(storedUser({ isActive: undefined }));

    const answer = await authenticate(tokenFor('user-1'));

    expect(answer).toMatchObject({ error: true, statusCode: 401, data: null });
    expect(JSON.stringify(answer)).not.toContain('user-1');
  });
});
