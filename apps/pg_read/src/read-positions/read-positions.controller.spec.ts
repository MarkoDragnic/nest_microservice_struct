import { Test, TestingModule } from '@nestjs/testing';
import { ReadPositionsController } from './read-positions.controller';
import { ReadPositionsService } from './read-positions.service';
import { InternalRpcGuard } from '@app/core';
import { Position, Robot } from '@app/postgres';

describe('ReadPositionsController', () => {
  let controller: ReadPositionsController;
  const readPositionsService = { findOpenForRobots: jest.fn() };

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
});
