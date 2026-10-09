import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedResponseDto, RobotTypes } from '@app/contracts';
import { InternalRpcGuard } from '@app/core';
import { Account, Funds, Instrument, Robot, User } from '@app/postgres';
import { ReadRobotsController } from './read-robots.controller';
import { ReadRobotsService } from './read-robots.service';

const INDICATORS = { open: { rsi: { enabled: true, period: 14, rule: 'less', value: 30 } } };

// A robot as the repository loads it for the list: owner, account, funds and instrument all come along.
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

// Every value of the loaded robot that the public list must not carry.
const NOT_IN_THE_LIST = [
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

describe('ReadRobotsController', () => {
  let controller: ReadRobotsController;
  const readRobotsService = { findAllActiveBySymbol: jest.fn(), findOne: jest.fn(), findPaginated: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadRobotsController],
      providers: [{ provide: ReadRobotsService, useValue: readRobotsService }],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReadRobotsController>(ReadRobotsController);
  });

  it('answers find-all-by-symbol with trading robots, not entities', async () => {
    const robot = Object.assign(new Robot(), {
      id: 'robot-1',
      name: 'Robot one',
      hash: 'robot-hash',
      account: null,
      funds: null,
    });
    readRobotsService.findAllActiveBySymbol.mockResolvedValue([robot]);

    const response = await controller.findAllBySymbol('BTCUSDT');

    expect(readRobotsService.findAllActiveBySymbol).toHaveBeenCalledWith('BTCUSDT');
    expect(response.data).toEqual([{ id: 'robot-1', account: null, funds: null, indicators: undefined }]);
    expect(Object.keys(response.data[0]).sort()).toEqual(['account', 'funds', 'id', 'indicators']);
  });

  describe('find-one', () => {
    it('answers with the symbol, the indicators and the owner id only', async () => {
      const robot = Object.assign(new Robot(), {
        id: 'robot-1',
        name: 'Robot one',
        hash: 'robot-hash',
        fsymbol: 'BTCUSDT',
        indicators: undefined,
        owner: Object.assign(new User(), { id: 'user-1', email: 'owner@example.com', notifyByEmail: true }),
      });
      readRobotsService.findOne.mockResolvedValue(robot);

      const response = await controller.findOne({ id: 'robot-1' });

      expect(readRobotsService.findOne).toHaveBeenCalledWith('robot-1');
      expect(response.data).toEqual({ fsymbol: 'BTCUSDT', indicators: undefined, owner: { id: 'user-1' } });
      expect(JSON.stringify(response.data)).not.toContain('owner@example.com');
    });

    it('rejects when the robot does not exist', async () => {
      readRobotsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('find-notification-target', () => {
    it('answers with the robot name and the owner contact fields only', async () => {
      const robot = Object.assign(new Robot(), {
        id: 'robot-1',
        name: 'Robot one',
        hash: 'robot-hash',
        fsymbol: 'BTCUSDT',
        owner: Object.assign(new User(), {
          id: 'user-1',
          email: 'owner@example.com',
          notifyByEmail: true,
          roles: ['user'],
        }),
      });
      readRobotsService.findOne.mockResolvedValue(robot);

      const response = await controller.findNotificationTarget({ id: 'robot-1' });

      expect(readRobotsService.findOne).toHaveBeenCalledWith('robot-1');
      expect(response.data).toEqual({ name: 'Robot one', owner: { email: 'owner@example.com', notifyByEmail: true } });
    });

    it('rejects when the robot does not exist', async () => {
      readRobotsService.findOne.mockResolvedValue(null);

      await expect(controller.findNotificationTarget({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('find-paginated', () => {
    beforeEach(() => {
      readRobotsService.findPaginated.mockResolvedValue(new PaginatedResponseDto([loadedRobot()], 1, 1, 20));
    });

    it('answers with the public fields of each robot, not the entities', async () => {
      const response = await controller.findPaginated({ userId: 'owner-id', page: 1, limit: 20 });

      expect(readRobotsService.findPaginated).toHaveBeenCalledWith('owner-id', 1, 20);
      expect(response.data).toEqual({
        data: [
          {
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
            funds: {
              initial: 1000,
              value: 900,
              reserved: 50,
              base: 'funds-base',
              dynamic: false,
              partial: '5',
              size: 10,
            },
            instrument: { name: 'Bitcoin', symbol: 'BTCUSDT' },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('lets nothing of the owner, the hash or the encrypted keys reach the answer', async () => {
      const response = await controller.findPaginated({ userId: 'owner-id', page: 1, limit: 20 });

      const [robot] = response.data.data;
      expect(Object.keys(robot).sort()).toEqual([
        'account',
        'active',
        'assets',
        'createdAt',
        'fsymbol',
        'funds',
        'id',
        'indicators',
        'instrument',
        'name',
        'type',
        'updatedAt',
      ]);
      expect(Object.keys(robot.account ?? {}).sort()).toEqual(['environment', 'exchange', 'id', 'revokedAt']);
      expect(Object.keys(robot.funds ?? {}).sort()).toEqual([
        'base',
        'dynamic',
        'initial',
        'partial',
        'reserved',
        'size',
        'value',
      ]);
      expect(Object.keys(robot.instrument ?? {}).sort()).toEqual(['name', 'symbol']);

      const onTheWire = JSON.stringify(response);
      for (const value of NOT_IN_THE_LIST) {
        expect(onTheWire).not.toContain(value);
      }
    });
  });
});
