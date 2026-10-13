import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import request from 'supertest';
import { TCP_EVENTS } from '@app/contracts';
import { GlobalHttpExceptionFilter, LoggerService } from '@app/core';
import { AUTH_SERVICE, PG_READ_SERVICE, ROBOTS_SERVICE } from '@app/messaging';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { RobotGateModule } from '../src/robot_gate/robot_gate.module';

// PATCH /robot over HTTP with the real OwnRobotGuard. Only the robots service behind it is a stand-in.

const loggerStub = { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

@Global()
@Module({
  providers: [{ provide: LoggerService, useValue: loggerStub }],
  exports: [LoggerService],
})
class MockLoggerModule {}

describe('PATCH /robot ownership (e2e)', () => {
  const ROBOT_ID = '7b0e5a52-6c1d-4f0e-9d53-0c1b8f6a2e11';
  const indicators = {
    open: {
      rsi: { enabled: true, period: 14, rule: 'less', value: 30 },
      hl: { enabled: false, period: 20, rule: 'greater', value: 0 },
    },
    close: {
      take_profit: { enabled: true, factor: 'percent', value: 5 },
      stop_lose: { enabled: true, factor: 'percent', value: 2 },
      min_profit: { enabled: false, factor: 'value', value: 0 },
      rsi: { enabled: false, period: 14, rule: 'greater', value: 70 },
      hl: { enabled: false, period: 20, rule: 'less', value: 0 },
    },
  };

  // What the robots service answers when asked who owns the robot.
  let ownerAnswer: unknown;
  const robotsClient = {
    send: jest.fn((pattern: string) =>
      of(pattern === TCP_EVENTS.ROBOT_GET_OWNER ? ownerAnswer : { error: false, data: { id: ROBOT_ID } }),
    ),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  };
  const otherClient = { send: jest.fn(), connect: jest.fn().mockResolvedValue(undefined), close: jest.fn() };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              INTERNAL_RPC_TOKEN: 'test-token',
              AUTH_CLIENT_HOST: 'localhost',
              AUTH_CLIENT_PORT: 30000,
              ROBOTS_CLIENT_HOST: 'localhost',
              ROBOTS_CLIENT_PORT: 30001,
              PG_READ_CLIENT_HOST: 'localhost',
              PG_READ_CLIENT_PORT: 30007,
            }),
          ],
        }),
        MockLoggerModule,
        RobotGateModule,
      ],
    })
      .overrideProvider(AUTH_SERVICE)
      .useValue(otherClient)
      .overrideProvider(ROBOTS_SERVICE)
      .useValue(robotsClient)
      .overrideProvider(PG_READ_SERVICE)
      .useValue(otherClient)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = { id: 'test-user-id' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    robotsClient.send.mockClear();
  });

  const patch = (robotId: unknown) =>
    request(app.getHttpServer())
      .patch('/robot')
      .send({ robotId, ...indicators });

  const patternsSent = () => robotsClient.send.mock.calls.map(([pattern]) => pattern);
  const withoutTimestamp = ({ timestamp: _timestamp, ...body }: Record<string, unknown>) => body;

  it('updates the indicators of a robot the user owns', async () => {
    ownerAnswer = { error: false, data: { owner: 'test-user-id' } };

    const res = await patch(ROBOT_ID);

    expect(res.status).toBe(200);
    expect(patternsSent()).toEqual([TCP_EVENTS.ROBOT_GET_OWNER, TCP_EVENTS.ROBOT_INDICATORS_UPSERT]);
  });

  it('answers 404 Robot not found for a robot of another user, and sends no update', async () => {
    ownerAnswer = { error: false, data: { owner: 'another-user-id' } };

    const res = await patch(ROBOT_ID);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: true, statusCode: 404, message: 'Robot not found', data: null });
    expect(patternsSent()).toEqual([TCP_EVENTS.ROBOT_GET_OWNER]);
  });

  it('answers a robot that does not exist exactly like a robot of another user', async () => {
    ownerAnswer = { error: false, data: { owner: 'another-user-id' } };
    const foreign = await patch(ROBOT_ID);

    ownerAnswer = { error: true, statusCode: 404, message: 'Entity not found.', data: null };
    const missing = await patch(ROBOT_ID);

    expect(missing.status).toBe(404);
    expect(withoutTimestamp(missing.body)).toEqual(withoutTimestamp(foreign.body));
    expect(patternsSent()).toEqual([TCP_EVENTS.ROBOT_GET_OWNER, TCP_EVENTS.ROBOT_GET_OWNER]);
  });

  it.each([
    ['text that is not a UUID', 'not-a-uuid'],
    ['a number', 42],
    ['nothing at all', undefined],
  ])('answers 400 for a robot id that is %s, before any service is asked', async (_case, robotId) => {
    ownerAnswer = { error: false, data: { owner: 'test-user-id' } };

    const res = await patch(robotId);

    expect(res.status).toBe(400);
    expect(robotsClient.send).not.toHaveBeenCalled();
  });

  it('answers 503, not 404, when the robots service cannot be reached in time', async () => {
    ownerAnswer = { error: true, statusCode: 503, message: 'Service timeout on robot.db.find-one', data: null };

    const res = await patch(ROBOT_ID);

    expect(res.status).toBe(503);
    expect(patternsSent()).toEqual([TCP_EVENTS.ROBOT_GET_OWNER]);
  });
});
