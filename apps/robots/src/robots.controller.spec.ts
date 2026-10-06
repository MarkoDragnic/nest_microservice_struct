import { Test, TestingModule } from '@nestjs/testing';
import { RobotsController } from './robots.controller';
import { RobotsService } from './robots.service';
import { LoggerService, InternalRpcGuard } from '@app/core';

describe('RobotsController', () => {
  let robotsController: RobotsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RobotsController],
      providers: [
        { provide: RobotsService, useValue: {} },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    robotsController = app.get<RobotsController>(RobotsController);
  });

  it('should be defined', () => {
    expect(robotsController).toBeDefined();
  });
});
