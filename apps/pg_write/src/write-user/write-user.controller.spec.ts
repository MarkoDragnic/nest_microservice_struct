import { Test, TestingModule } from '@nestjs/testing';
import { WriteUserController } from './write-user.controller';
import { WriteUserService } from './write-user.service';
import { InternalRpcGuard } from '@app/common';
import { LoggerService } from '@app/common/logger';

describe('WriteUserController', () => {
  let controller: WriteUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WriteUserController],
      providers: [
        { provide: WriteUserService, useValue: {} },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WriteUserController>(WriteUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
