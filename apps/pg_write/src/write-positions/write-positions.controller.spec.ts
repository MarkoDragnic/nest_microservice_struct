import { Test, TestingModule } from '@nestjs/testing';
import { WritePositionsController } from './write-positions.controller';
import { WritePositionsService } from './write-positions.service';
import { InternalRpcGuard } from '@app/common';

describe('WritePositionsController', () => {
  let controller: WritePositionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WritePositionsController],
      providers: [{ provide: WritePositionsService, useValue: {} }],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WritePositionsController>(WritePositionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
