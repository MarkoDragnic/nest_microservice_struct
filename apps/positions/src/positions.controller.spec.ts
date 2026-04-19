import { Test, TestingModule } from '@nestjs/testing';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { LoggerService } from '@app/common/logger';
import { InternalRpcGuard } from '@app/common';

describe('PositionsController', () => {
  let positionsController: PositionsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PositionsController],
      providers: [
        { provide: PositionsService, useValue: {} },
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
});
