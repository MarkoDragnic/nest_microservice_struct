import { Test, TestingModule } from '@nestjs/testing';
import { HistoryProviderController } from './history_provider.controller';
import { HistoryProviderService } from './history_provider.service';
import { LoggerService, InternalRpcGuard } from '@app/core';

describe('HistoryProviderController', () => {
  let historyProviderController: HistoryProviderController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HistoryProviderController],
      providers: [
        { provide: HistoryProviderService, useValue: {} },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    historyProviderController = app.get<HistoryProviderController>(HistoryProviderController);
  });

  it('should be defined', () => {
    expect(historyProviderController).toBeDefined();
  });
});
