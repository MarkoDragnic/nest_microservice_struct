import { Test, TestingModule } from '@nestjs/testing';
import { WriteFundsController } from './write-funds.controller';
import { WriteFundsService } from './write-funds.service';
import { InternalRpcGuard } from '@app/common';

describe('WriteFundsController', () => {
  let controller: WriteFundsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WriteFundsController],
      providers: [{ provide: WriteFundsService, useValue: {} }],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WriteFundsController>(WriteFundsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
