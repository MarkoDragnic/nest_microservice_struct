import { Test, TestingModule } from '@nestjs/testing';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { RobotTypes, TCP_DB_EVENTS } from '@app/contracts';
import { InternalRpcGuard, LoggerService } from '@app/core';
import { Account, Funds, Instrument, Robot, User } from '@app/postgres';
import { WriteRobotController } from './write-robots.controller';
import { WriteRobotsService } from './write-robots.service';

const INDICATORS = { open: { rsi: { enabled: true, period: 14, rule: 'less', value: 30 } } };

// A robot as the service hands it back after a write: read from the database with every relation loaded.
const loadedRobot = () =>
  Object.assign(new Robot(), {
    id: 'robot-1',
    name: 'Robot one',
    fsymbol: 'BTCUSDT',
    type: RobotTypes.TEST,
    assets: 'BTC',
    active: true,
    hash: 'robot-hash',
    indicators: INDICATORS,
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    updatedAt: new Date('2026-01-04T00:00:00.000Z'),
    owner: Object.assign(new User(), {
      id: 'owner-id',
      email: 'owner@example.com',
      password: 'owner-password-hash',
      roles: ['owner-role'],
      notifyByEmail: true,
      createdAt: new Date('2019-01-01T00:00:00.000Z'),
      updatedAt: new Date('2019-01-02T00:00:00.000Z'),
      isActive: true,
    }),
    account: Object.assign(new Account(), {
      id: 'account-1',
      userId: 'owner-id',
      exchange: 'binance',
      environment: 'sandbox',
      apiKeyEncrypted: { iv: 'api-key-iv', content: 'api-key-ciphertext', tag: 'api-key-tag' },
      apiSecretEncrypted: { iv: 'api-secret-iv', content: 'api-secret-ciphertext', tag: 'api-secret-tag' },
      createdAt: new Date('2020-02-02T00:00:00.000Z'),
      revokedAt: null,
    }),
    funds: Object.assign(new Funds(), {
      id: 'funds-id',
      initial: 1000,
      value: 900,
      reserved: 50,
      base: 'funds-base',
      dynamic: false,
      partial: '5',
      size: 10,
    }),
    instrument: Object.assign(new Instrument(), { id: 'instrument-id', name: 'Bitcoin', symbol: 'BTCUSDT' }),
  });

const PUBLIC_ROBOT = {
  id: 'robot-1',
  name: 'Robot one',
  fsymbol: 'BTCUSDT',
  type: RobotTypes.TEST,
  assets: 'BTC',
  active: true,
  indicators: INDICATORS,
  createdAt: '2026-01-03T00:00:00.000Z',
  updatedAt: '2026-01-04T00:00:00.000Z',
  account: { id: 'account-1', exchange: 'binance', environment: 'sandbox', revokedAt: null },
  funds: { initial: 1000, value: 900, reserved: 50, base: 'funds-base', dynamic: false, partial: '5', size: 10 },
  instrument: { name: 'Bitcoin', symbol: 'BTCUSDT' },
};

// Every value of the loaded robot that an answer must not carry.
const NOT_IN_AN_ANSWER = [
  'owner-id',
  'owner@example.com',
  'owner-password-hash',
  'owner-role',
  '2019-01-0',
  'api-key-iv',
  'api-key-ciphertext',
  'api-key-tag',
  'api-secret-iv',
  'api-secret-ciphertext',
  'api-secret-tag',
  '2020-02-02',
  'robot-hash',
  'funds-id',
  'instrument-id',
];

type Handler = (payload: unknown) => Promise<{ data: unknown }>;

// Every @MessagePattern handler of the controller, read from the metadata Nest registers it by,
// so a handler added later is checked without anyone listing it here.
const messageHandlers = (controller: { prototype: object }): [pattern: string, method: string][] =>
  Object.getOwnPropertyNames(controller.prototype).flatMap((method) => {
    const patterns: string[] | undefined = Reflect.getMetadata(PATTERN_METADATA, controller.prototype[method]);
    return (patterns ?? []).map((pattern): [string, string] => [pattern, method]);
  });

// Every method of the service answers with the loaded robot, whichever one a handler calls.
const serviceAnsweringWith = (service: { prototype: object }, answer: () => unknown) =>
  Object.fromEntries(
    Object.getOwnPropertyNames(service.prototype)
      .filter((method) => method !== 'constructor')
      .map((method) => [method, jest.fn(() => Promise.resolve(answer()))]),
  );

describe('WriteRobotController', () => {
  let controller: WriteRobotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WriteRobotController],
      providers: [
        { provide: WriteRobotsService, useValue: serviceAnsweringWith(WriteRobotsService, loadedRobot) },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WriteRobotController>(WriteRobotController);
  });

  const handlers = messageHandlers(WriteRobotController);

  it('has the create and the upsert-indicators handlers to check', () => {
    expect(handlers.map(([pattern]) => pattern).sort()).toEqual(
      [TCP_DB_EVENTS.ROBOT_CREATE, TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT].sort(),
    );
  });

  it.each(handlers)('answers %s with the public fields of the robot, not the entity', async (_pattern, method) => {
    const handler = (controller as unknown as Record<string, Handler>)[method].bind(controller);

    const response = await handler({});

    expect(response.data).toEqual(PUBLIC_ROBOT);
  });

  it.each(handlers)(
    'lets nothing of the owner, the hash or the encrypted keys reach the answer of %s',
    async (_pattern, method) => {
      const handler = (controller as unknown as Record<string, Handler>)[method].bind(controller);

      const response = await handler({});

      const robot = response.data as typeof PUBLIC_ROBOT;
      expect(Object.keys(robot).sort()).toEqual(Object.keys(PUBLIC_ROBOT).sort());
      expect(Object.keys(robot.account).sort()).toEqual(['environment', 'exchange', 'id', 'revokedAt']);
      expect(Object.keys(robot.funds).sort()).toEqual([
        'base',
        'dynamic',
        'initial',
        'partial',
        'reserved',
        'size',
        'value',
      ]);
      expect(Object.keys(robot.instrument).sort()).toEqual(['name', 'symbol']);

      const onTheWire = JSON.stringify(response);
      for (const value of NOT_IN_AN_ANSWER) {
        expect(onTheWire).not.toContain(value);
      }
    },
  );
});
