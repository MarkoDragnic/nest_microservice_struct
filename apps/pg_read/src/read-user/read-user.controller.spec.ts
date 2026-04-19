import { Test, TestingModule } from '@nestjs/testing';
import { ReadUserController } from './read-user.controller';
import { ReadUserService } from './read-user.service';
import { InternalRpcGuard, SerializerService } from '@app/common';
import { LoggerService } from '@app/common/logger';

describe('ReadUserController', () => {
  let controller: ReadUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadUserController],
      providers: [
        { provide: ReadUserService, useValue: {} },
        { provide: SerializerService, useValue: { serialize: jest.fn() } },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReadUserController>(ReadUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
