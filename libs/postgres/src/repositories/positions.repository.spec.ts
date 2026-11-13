import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PositionsRepository } from './positions.repository';
import { Funds, Position, Robot } from '../models';
import { ClosePositionDto, OpenPositionDto } from '@app/contracts/dto';
import { PositionCloseReason, PositionStatus, RobotTypes } from '@app/contracts/types';
import { LoggerService } from '@app/core/logger';

type Table = 'robot' | 'funds' | 'position';
type Rows = { robot?: Robot; funds?: Funds; position?: Position; savedPosition?: Position };

// Stands in for the manager of the transaction and records, in order, every statement the repository sends.
const standInManager = (rows: Rows) => {
  const statements: string[] = [];
  const lockedBy: Partial<Record<Table, unknown[]>> = {};
  const kind = (lockMode?: string) => (lockMode === 'pessimistic_write' ? 'lock' : 'read');

  const standInRepository = (table: Table) => ({
    findOne: jest.fn(async (options: { where: object; lock?: { mode: string } }) => {
      statements.push(`${kind(options.lock?.mode)} ${table}`);
      if (options.lock) lockedBy[table] = Object.values(options.where);
      return rows[table] ?? null;
    }),
    createQueryBuilder: jest.fn(() => {
      const tables: string[] = [table];
      const parameters: Record<string, unknown> = {};
      let lockMode: string | undefined;
      const builder = {
        select: () => builder,
        innerJoinAndSelect: (property: string) => {
          tables.push(property.split('.')[1]);
          return builder;
        },
        setLock: (mode: string) => {
          lockMode = mode;
          return builder;
        },
        where: (_condition: unknown, values: object = {}) => {
          Object.assign(parameters, values);
          return builder;
        },
        setParameter: (name: string, value: unknown) => {
          parameters[name] = value;
          return builder;
        },
        getOne: async () => {
          statements.push(`${kind(lockMode)} ${tables.join(' with ')}`);
          if (lockMode) lockedBy[table] = Object.values(parameters);
          return rows[table] ?? null;
        },
      };
      return builder;
    }),
    create: jest.fn((values: unknown) => values),
    save: jest.fn(async (entity: unknown) => {
      statements.push(`write ${table}`);
      return table === 'position' && rows.savedPosition ? rows.savedPosition : entity;
    }),
  });

  const robot = standInRepository('robot');
  const funds = standInRepository('funds');
  const position = standInRepository('position');
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === Robot) return robot;
      if (entity === Funds) return funds;
      if (entity === Position) return position;
      throw new Error(`Unexpected repository request: ${String(entity)}`);
    },
  };

  return { manager, statements, lockedBy, robot, funds, position };
};

describe('PositionsRepository', () => {
  let repository: PositionsRepository;
  let dataSource: { transaction: jest.Mock };
  let logger: { setContext: jest.Mock; warn: jest.Mock };

  const buildOpenDto = (overrides: Partial<OpenPositionDto> = {}): OpenPositionDto => ({
    robotId: '11111111-1111-1111-1111-111111111111',
    symbol: 'BTCUSDT',
    status: PositionStatus.OPEN,
    entryPrice: 50,
    openedAt: '2026-03-26T10:00:00.000Z',
    quantity: 2,
    ...overrides,
  });

  const buildCloseDto = (overrides: Partial<ClosePositionDto> = {}): ClosePositionDto => ({
    positionId: '22222222-2222-2222-2222-222222222222',
    symbol: 'BTCUSDT',
    status: PositionStatus.CLOSED,
    closePrice: 55,
    closedAt: '2026-03-26T12:00:00.000Z',
    ...overrides,
  });

  const buildRobot = (): Robot =>
    ({
      id: 'robot-1',
      type: RobotTypes.LIVE,
      funds: { id: 'funds-1' } as Funds,
    }) as Robot;

  const buildFunds = (overrides: Partial<Funds> = {}): Funds =>
    ({ id: 'funds-1', value: 1000, reserved: 0, ...overrides }) as Funds;

  const buildPosition = (overrides: Partial<Position> = {}): Position =>
    ({
      id: 'position-1',
      status: PositionStatus.OPEN,
      quantity: 2,
      openTransactionValue: 100,
      transaction: 100,
      ...overrides,
    }) as Position;

  const inTransaction = (rows: Rows) => {
    const db = standInManager(rows);
    dataSource.transaction.mockImplementation(async (callback) => callback(db.manager));
    return db;
  };

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn(),
    };

    logger = {
      setContext: jest.fn(),
      warn: jest.fn(),
    };

    repository = new PositionsRepository(
      {} as Repository<Position>,
      dataSource as unknown as DataSource,
      logger as unknown as LoggerService,
    );
  });

  describe('openTransactional', () => {
    it('moves the open value from available funds into reserved funds', async () => {
      const openDto = buildOpenDto();
      const funds = buildFunds({ value: 1000, reserved: 0 });
      const savedPosition = { id: 'position-1' } as Position;
      const db = inTransaction({ robot: buildRobot(), funds, savedPosition });

      const result = await repository.openTransactional(openDto);

      expect(result).toBe(savedPosition);
      expect(funds.value).toBe(900);
      expect(funds.reserved).toBe(100);
      expect(db.funds.save).toHaveBeenCalledWith(funds);
      expect(db.position.create).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTCUSDT',
          status: PositionStatus.OPEN,
          entryPrice: 50,
          quantity: 2,
          openTransactionValue: 100,
          transaction: 100,
        }),
      );
    });

    it('rejects the open when there is not enough available balance', async () => {
      const openDto = buildOpenDto({ entryPrice: 60 });
      inTransaction({ robot: buildRobot(), funds: buildFunds({ value: 100, reserved: 0 }) });

      await expect(repository.openTransactional(openDto)).rejects.toThrow(BadRequestException);
    });

    it('locks the robot first, then its funds, and writes only after both locks', async () => {
      const db = inTransaction({ robot: buildRobot(), funds: buildFunds() });

      await repository.openTransactional(buildOpenDto());

      expect(db.statements).toEqual(['lock robot', 'read robot', 'lock funds', 'write funds', 'write position']);
    });

    it('locks the robot named in the request and the funds of that robot', async () => {
      const openDto = buildOpenDto();
      const db = inTransaction({ robot: buildRobot(), funds: buildFunds() });

      await repository.openTransactional(openDto);

      expect(db.lockedBy).toEqual({ robot: [openDto.robotId], funds: ['funds-1'] });
    });

    it('asks for nothing else when the robot does not exist', async () => {
      const db = inTransaction({});

      await expect(repository.openTransactional(buildOpenDto())).rejects.toThrow(
        new NotFoundException('Robot not found'),
      );

      expect(db.statements).toEqual(['lock robot']);
    });
  });

  describe('closeTransactional', () => {
    it('releases reserved funds and records the realized delta', async () => {
      const closeDto = buildCloseDto({ closeReason: PositionCloseReason.MANUAL });
      const funds = buildFunds({ value: 900, reserved: 100 });
      const robot = buildRobot();
      const position = buildPosition({ robot });
      const db = inTransaction({ robot, funds, position });

      const result = await repository.closeTransactional(closeDto);

      expect(result).toBe(position);
      expect(position.status).toBe(PositionStatus.CLOSED);
      expect(position.closePrice).toBe(55);
      expect(position.closeReason).toBe(PositionCloseReason.MANUAL);
      expect(position.closeTransactionValue).toBe(110);
      expect(position.transaction).toBe(10);
      expect(funds.value).toBe(1010);
      expect(funds.reserved).toBe(0);
      expect(db.funds.save).toHaveBeenCalledWith(funds);
      expect(db.position.save).toHaveBeenCalledWith(position);
    });

    it('rejects the close when the position is already closed', async () => {
      const robot = buildRobot();
      const position = buildPosition({ robot, status: PositionStatus.CLOSED });
      inTransaction({ robot, funds: buildFunds({ value: 900, reserved: 100 }), position });

      await expect(repository.closeTransactional(buildCloseDto())).rejects.toThrow(ConflictException);
    });

    it('leaves the funds and the position as they were when the position is already closed', async () => {
      const robot = buildRobot();
      const funds = buildFunds({ value: 900, reserved: 100 });
      const position = buildPosition({ robot, status: PositionStatus.CLOSED });
      const db = inTransaction({ robot, funds, position });

      await expect(repository.closeTransactional(buildCloseDto())).rejects.toThrow(ConflictException);

      expect(funds).toEqual(buildFunds({ value: 900, reserved: 100 }));
      expect(position).toEqual(buildPosition({ robot, status: PositionStatus.CLOSED }));
      expect(db.statements.filter((statement) => statement.startsWith('write'))).toEqual([]);
    });

    it('locks the robot first, then its funds, then the position alone, and writes only after all three', async () => {
      const robot = buildRobot();
      const db = inTransaction({
        robot,
        funds: buildFunds({ value: 900, reserved: 100 }),
        position: buildPosition({ robot }),
      });

      await repository.closeTransactional(buildCloseDto());

      expect(db.statements).toEqual([
        'lock robot',
        'read robot',
        'lock funds',
        'lock position',
        'write funds',
        'write position',
      ]);
    });

    it('locks the robot of the position named in the request, its funds, and that position', async () => {
      const closeDto = buildCloseDto();
      const robot = buildRobot();
      const db = inTransaction({
        robot,
        funds: buildFunds({ value: 900, reserved: 100 }),
        position: buildPosition({ robot }),
      });

      await repository.closeTransactional(closeDto);

      expect(db.lockedBy).toEqual({
        robot: [closeDto.positionId],
        funds: ['funds-1'],
        position: [closeDto.positionId],
      });
    });

    it('asks for nothing else when the position does not exist', async () => {
      const db = inTransaction({});

      await expect(repository.closeTransactional(buildCloseDto())).rejects.toThrow(
        new NotFoundException('Position not found'),
      );

      expect(db.statements).toEqual(['lock robot']);
    });
  });
});
