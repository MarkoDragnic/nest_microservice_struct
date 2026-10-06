import { Test, TestingModule } from '@nestjs/testing';
import { WritePositionsController } from './write-positions.controller';
import { WritePositionsService } from './write-positions.service';
import { InternalRpcGuard } from '@app/core';
import { Position, Robot } from '@app/postgres';
import { ClosePositionDto, OpenPositionDto } from '@app/contracts';

describe('WritePositionsController', () => {
  let controller: WritePositionsController;
  const writePositionsService = { openTransactional: jest.fn(), closeTransactional: jest.fn() };

  const savedPosition = (overrides: Partial<Position> = {}) =>
    Object.assign(new Position(), {
      id: 'position-1',
      robot: Object.assign(new Robot(), { id: 'robot-1', name: 'Robot one', hash: 'robot-hash' }),
      symbol: 'BTCUSDT',
      entryPrice: 50000,
      quantity: 0.01,
      openedAt: new Date('2026-01-05T00:00:00.000Z'),
      openTransactionValue: 500,
      transaction: 500,
      ...overrides,
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WritePositionsController],
      providers: [{ provide: WritePositionsService, useValue: writePositionsService }],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WritePositionsController>(WritePositionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('answers open-transactional with a position change, not the entity', async () => {
    writePositionsService.openTransactional.mockResolvedValue(savedPosition());

    const response = await controller.openTransactional({ robotId: 'robot-1' } as OpenPositionDto);

    expect(response.data).toEqual({
      id: 'position-1',
      symbol: 'BTCUSDT',
      entryPrice: 50000,
      quantity: 0.01,
      openedAt: '2026-01-05T00:00:00.000Z',
      closePrice: null,
      closedAt: null,
      transaction: 500,
    });
  });

  it('answers close-transactional with a position change, not the entity', async () => {
    writePositionsService.closeTransactional.mockResolvedValue(
      savedPosition({ closePrice: 51000, closedAt: new Date('2026-01-06T07:08:09.000Z'), transaction: 10 }),
    );

    const response = await controller.closeTransactional({ positionId: 'position-1' } as ClosePositionDto);

    expect(response.data).toEqual({
      id: 'position-1',
      symbol: 'BTCUSDT',
      entryPrice: 50000,
      quantity: 0.01,
      openedAt: '2026-01-05T00:00:00.000Z',
      closePrice: 51000,
      closedAt: '2026-01-06T07:08:09.000Z',
      transaction: 10,
    });
    expect(JSON.stringify(response.data)).not.toContain('robot-hash');
  });
});
