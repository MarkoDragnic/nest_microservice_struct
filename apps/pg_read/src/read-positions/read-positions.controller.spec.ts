import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReadPositionsController } from './read-positions.controller';
import { ReadPositionsService } from './read-positions.service';
import { PaginatedResponseDto, PositionCloseReason, PositionStatus, RobotTypes } from '@app/contracts';
import { InternalRpcGuard } from '@app/core';
import { Account, Funds, Instrument, Position, Robot, User } from '@app/postgres';

// A closed position as the repository loads it for the list: the robot relation is eager, and so are
// the robot's owner, account, funds and instrument, so all of them come along with every position.
const loadedPosition = () =>
  Object.assign(new Position(), {
    id: 'position-1',
    symbol: 'BTCUSDT',
    type: RobotTypes.TEST,
    status: PositionStatus.CLOSED,
    entryPrice: 50000,
    closePrice: 51000,
    openedAt: new Date('2026-01-05T00:00:00.000Z'),
    closedAt: new Date('2026-01-06T00:00:00.000Z'),
    closeReason: PositionCloseReason.STRATEGY,
    quantity: 0.01,
    openTransactionValue: 500,
    closeTransactionValue: 510,
    transaction: 777,
    rules: { open: { rsi: { enabled: true, period: 14, rule: 'position-rule', value: 30 } } },
    robot: Object.assign(new Robot(), {
      id: 'robot-1',
      name: 'Robot one',
      fsymbol: 'ROBOT-FULL-SYMBOL',
      type: RobotTypes.TEST,
      assets: 'robot-assets',
      active: true,
      hash: 'robot-hash',
      indicators: { open: { rsi: { enabled: true, period: 14, rule: 'robot-rule', value: 30 } } },
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-04T00:00:00.000Z'),
      owner: Object.assign(new User(), {
        id: 'owner-id',
        email: 'owner@example.com',
        password: 'owner-password-hash',
        roles: ['owner-role'],
        notifyByEmail: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        isActive: true,
      }),
      account: Object.assign(new Account(), {
        id: 'account-id',
        userId: 'owner-id',
        exchange: 'account-exchange',
        environment: 'account-environment',
        apiKeyEncrypted: { iv: 'api-key-iv', content: 'api-key-ciphertext', tag: 'api-key-tag' },
        apiSecretEncrypted: { iv: 'api-secret-iv', content: 'api-secret-ciphertext', tag: 'api-secret-tag' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        revokedAt: null,
      }),
      funds: Object.assign(new Funds(), {
        id: 'funds-id',
        initial: 1000,
        value: 900,
        reserved: 50,
        base: 'funds-base',
        dynamic: false,
        partial: 'funds-partial',
        size: 10,
      }),
      instrument: Object.assign(new Instrument(), {
        id: 'instrument-id',
        name: 'instrument-name',
        symbol: 'instrument-symbol',
      }),
    }),
  });

// Every value of the loaded position that the public list must not carry.
const NOT_IN_THE_LIST = [
  'owner-id',
  'owner@example.com',
  'owner-password-hash',
  'owner-role',
  'account-id',
  'account-exchange',
  'account-environment',
  'api-key-iv',
  'api-key-ciphertext',
  'api-key-tag',
  'api-secret-iv',
  'api-secret-ciphertext',
  'api-secret-tag',
  'funds-id',
  'funds-base',
  'funds-partial',
  'instrument-id',
  'instrument-name',
  'instrument-symbol',
  'robot-hash',
  'ROBOT-FULL-SYMBOL',
  'robot-assets',
  'robot-rule',
  'position-rule',
  '777',
];

describe('ReadPositionsController', () => {
  let controller: ReadPositionsController;
  const readPositionsService = { findOpenForRobots: jest.fn(), findOne: jest.fn(), findPaginated: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadPositionsController],
      providers: [{ provide: ReadPositionsService, useValue: readPositionsService }],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReadPositionsController>(ReadPositionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('find-one', () => {
    it('answers with the notification target of the position robot, not the entity', async () => {
      const position = Object.assign(new Position(), {
        id: 'position-1',
        symbol: 'BTCUSDT',
        robot: Object.assign(new Robot(), {
          id: 'robot-1',
          name: 'Robot one',
          hash: 'robot-hash',
          owner: Object.assign(new User(), { id: 'user-1', email: 'owner@example.com', notifyByEmail: false }),
          account: Object.assign(new Account(), {
            id: 'account-1',
            apiKeyEncrypted: { iv: 'iv', content: 'api-key', tag: 'tag' },
          }),
        }),
      });
      readPositionsService.findOne.mockResolvedValue(position);

      const response = await controller.findOne({ id: 'position-1' });

      expect(readPositionsService.findOne).toHaveBeenCalledWith('position-1');
      expect(response.data).toEqual({
        robot: { name: 'Robot one', owner: { email: 'owner@example.com', notifyByEmail: false } },
      });
      expect(JSON.stringify(response.data)).not.toContain('api-key');
    });

    it('rejects when the position does not exist', async () => {
      readPositionsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('answers open-for-robots with trading positions, not entities', async () => {
    const position = Object.assign(new Position(), {
      id: 'position-1',
      robot: Object.assign(new Robot(), { id: 'robot-1', name: 'Robot one', hash: 'robot-hash' }),
      symbol: 'BTCUSDT',
      quantity: 0.01,
      entryPrice: 50000,
      transaction: 500,
    });
    readPositionsService.findOpenForRobots.mockResolvedValue([position]);

    const response = await controller.findOpenForRobot({ robotIds: ['robot-1'], symbol: 'BTCUSDT' });

    expect(response.data).toEqual([
      {
        id: 'position-1',
        robot: { id: 'robot-1' },
        symbol: 'BTCUSDT',
        quantity: 0.01,
        entryPrice: 50000,
        rules: undefined,
      },
    ]);
    expect(Object.keys(response.data[0].robot)).toEqual(['id']);
  });

  describe('find-paginated', () => {
    beforeEach(() => {
      readPositionsService.findPaginated.mockResolvedValue(new PaginatedResponseDto([loadedPosition()], 1, 1, 20));
    });

    it('answers with the public fields of each position, not the entities', async () => {
      const response = await controller.findPaginated({ userId: 'owner-id', page: 1, limit: 20 });

      expect(readPositionsService.findPaginated).toHaveBeenCalledWith('owner-id', 1, 20);
      expect(response.data).toEqual({
        data: [
          {
            id: 'position-1',
            symbol: 'BTCUSDT',
            type: RobotTypes.TEST,
            status: PositionStatus.CLOSED,
            entryPrice: 50000,
            closePrice: 51000,
            quantity: 0.01,
            openTransactionValue: 500,
            closeTransactionValue: 510,
            closeReason: PositionCloseReason.STRATEGY,
            openedAt: '2026-01-05T00:00:00.000Z',
            closedAt: '2026-01-06T00:00:00.000Z',
            robot: { id: 'robot-1', name: 'Robot one' },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('lets nothing of the owner, the account, the funds or the rest of the robot reach the answer', async () => {
      const response = await controller.findPaginated({ userId: 'owner-id', page: 1, limit: 20 });

      const [position] = response.data.data;
      expect(Object.keys(position).sort()).toEqual([
        'closePrice',
        'closeReason',
        'closeTransactionValue',
        'closedAt',
        'entryPrice',
        'id',
        'openTransactionValue',
        'openedAt',
        'quantity',
        'robot',
        'status',
        'symbol',
        'type',
      ]);
      expect(Object.keys(position.robot).sort()).toEqual(['id', 'name']);

      const onTheWire = JSON.stringify(response);
      for (const value of NOT_IN_THE_LIST) {
        expect(onTheWire).not.toContain(value);
      }
    });
  });
});
