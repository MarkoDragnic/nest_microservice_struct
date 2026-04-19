import { Test, TestingModule } from '@nestjs/testing';
import { ReadPositionsController } from './read-positions.controller';
import { ReadPositionsService } from './read-positions.service';
import { InternalRpcGuard } from '@app/common';

describe('ReadPositionsController', () => {
  let controller: ReadPositionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadPositionsController],
      providers: [{ provide: ReadPositionsService, useValue: {} }],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReadPositionsController>(ReadPositionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
