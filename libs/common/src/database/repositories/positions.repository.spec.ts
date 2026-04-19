import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PositionsRepository } from './positions.repository';
import { Funds, Position, Robot } from '@app/common/models';
import { ClosePositionDto, OpenPositionDto } from '@app/common/dto';
import { PositionCloseReason, PositionStatus, RobotTypes } from '@app/common/types';
import { LoggerService } from '@app/common/logger';

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
			const funds: Funds = { id: 'funds-1', value: 1000, reserved: 0 } as Funds;
			const robot: Robot = {
				id: 'robot-1',
				type: RobotTypes.LIVE,
				funds: { id: 'funds-1' } as Funds,
			} as Robot;
			const savedPosition = { id: 'position-1' } as Position;

			const robotRepository = {
				findOne: jest.fn().mockResolvedValue(robot),
			};
			const fundsRepository = {
				findOne: jest.fn().mockResolvedValue(funds),
				save: jest.fn().mockImplementation(async (entity) => entity),
			};
			const positionsRepository = {
				create: jest.fn().mockImplementation((entity) => entity),
				save: jest.fn().mockResolvedValue(savedPosition),
			};
			const manager = {
				getRepository: jest.fn((entity) => {
					if (entity === Robot) return robotRepository;
					if (entity === Funds) return fundsRepository;
					if (entity === Position) return positionsRepository;
					throw new Error(`Unexpected repository request: ${String(entity)}`);
				}),
			};

			dataSource.transaction.mockImplementation(async (callback) => callback(manager));

			const result = await repository.openTransactional(openDto);

			expect(result).toBe(savedPosition);
			expect(funds.value).toBe(900);
			expect(funds.reserved).toBe(100);
			expect(fundsRepository.save).toHaveBeenCalledWith(funds);
			expect(positionsRepository.create).toHaveBeenCalledWith(
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
			const funds: Funds = { id: 'funds-1', value: 100, reserved: 0 } as Funds;
			const robot: Robot = {
				id: 'robot-1',
				type: RobotTypes.LIVE,
				funds: { id: 'funds-1' } as Funds,
			} as Robot;

			const manager = {
				getRepository: jest.fn((entity) => {
					if (entity === Robot) {
						return { findOne: jest.fn().mockResolvedValue(robot) };
					}

					if (entity === Funds) {
						return {
							findOne: jest.fn().mockResolvedValue(funds),
							save: jest.fn(),
						};
					}

					if (entity === Position) {
						return {
							create: jest.fn(),
							save: jest.fn(),
						};
					}

					throw new Error(`Unexpected repository request: ${String(entity)}`);
				}),
			};

			dataSource.transaction.mockImplementation(async (callback) => callback(manager));

			await expect(repository.openTransactional(openDto)).rejects.toThrow(BadRequestException);
		});
	});

	describe('closeTransactional', () => {
		it('releases reserved funds and records the realized delta', async () => {
			const closeDto = buildCloseDto({ closeReason: PositionCloseReason.MANUAL });
			const funds: Funds = { id: 'funds-1', value: 900, reserved: 100 } as Funds;
			const robot: Robot = {
				id: 'robot-1',
				funds: { id: 'funds-1' } as Funds,
			} as Robot;
			const position: Position = {
				id: 'position-1',
				robot,
				status: PositionStatus.OPEN,
				quantity: 2,
				openTransactionValue: 100,
				transaction: 100,
			} as Position;

			const queryBuilder = {
				innerJoinAndSelect: jest.fn().mockReturnThis(),
				setLock: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getOne: jest.fn().mockResolvedValue(position),
			};
			const positionsRepository = {
				createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
				save: jest.fn().mockImplementation(async (entity) => entity),
			};
			const robotRepository = {
				findOne: jest.fn().mockResolvedValue(robot),
			};
			const fundsRepository = {
				findOne: jest.fn().mockResolvedValue(funds),
				save: jest.fn().mockImplementation(async (entity) => entity),
			};
			const manager = {
				getRepository: jest.fn((entity) => {
					if (entity === Position) return positionsRepository;
					if (entity === Robot) return robotRepository;
					if (entity === Funds) return fundsRepository;
					throw new Error(`Unexpected repository request: ${String(entity)}`);
				}),
			};

			dataSource.transaction.mockImplementation(async (callback) => callback(manager));

			const result = await repository.closeTransactional(closeDto);

			expect(result).toBe(position);
			expect(position.status).toBe(PositionStatus.CLOSED);
			expect(position.closePrice).toBe(55);
			expect(position.closeReason).toBe(PositionCloseReason.MANUAL);
			expect(position.closeTransactionValue).toBe(110);
			expect(position.transaction).toBe(10);
			expect(funds.value).toBe(1010);
			expect(funds.reserved).toBe(0);
			expect(fundsRepository.save).toHaveBeenCalledWith(funds);
			expect(positionsRepository.save).toHaveBeenCalledWith(position);
		});

		it('rejects the close when the position is already closed', async () => {
			const closeDto = buildCloseDto();
			const position: Position = {
				id: 'position-1',
				robot: { id: 'robot-1' } as Robot,
				status: PositionStatus.CLOSED,
				quantity: 2,
				openTransactionValue: 100,
				transaction: 100,
			} as Position;
			const queryBuilder = {
				innerJoinAndSelect: jest.fn().mockReturnThis(),
				setLock: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				getOne: jest.fn().mockResolvedValue(position),
			};
			const manager = {
				getRepository: jest.fn((entity) => {
					if (entity === Position) {
						return {
							createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
							save: jest.fn(),
						};
					}

					if (entity === Robot || entity === Funds) {
						return { findOne: jest.fn(), save: jest.fn() };
					}

					throw new Error(`Unexpected repository request: ${String(entity)}`);
				}),
			};

			dataSource.transaction.mockImplementation(async (callback) => callback(manager));

			await expect(repository.closeTransactional(closeDto)).rejects.toThrow(ConflictException);
		});
	});
});
