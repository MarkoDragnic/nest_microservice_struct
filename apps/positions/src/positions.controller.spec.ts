import { Test, TestingModule } from '@nestjs/testing';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { LoggerService, InternalRpcGuard } from '@app/core';
import { ClosePositionDto, OpenPositionDto } from '@app/contracts';

describe('PositionsController', () => {
  let positionsController: PositionsController;
  const positionsService = { create: jest.fn(), close: jest.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PositionsController],
      providers: [
        { provide: PositionsService, useValue: positionsService },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    positionsController = app.get<PositionsController>(PositionsController);
  });

  it('should be defined', () => {
    expect(positionsController).toBeDefined();
  });

  // Trader reads nothing from these answers, so they carry no data. They still answer with the
  // tcpOk envelope, never undefined, so the caller gets a real success message.
  it('acknowledges an opened position with no data', async () => {
    positionsService.create.mockResolvedValue({ id: 'position-1', symbol: 'BTCUSDT' });

    await expect(positionsController.openPosition({ robotId: 'robot-1' } as OpenPositionDto)).resolves.toEqual({
      error: false,
      message: 'Position created',
      data: null,
    });
  });

  it('acknowledges a closed position with no data', async () => {
    positionsService.close.mockResolvedValue({ id: 'position-1', symbol: 'BTCUSDT' });

    await expect(positionsController.closePosition({ positionId: 'position-1' } as ClosePositionDto)).resolves.toEqual({
      error: false,
      message: 'Position closed',
      data: null,
    });
  });
});
