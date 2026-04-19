import { Test, TestingModule } from '@nestjs/testing';
import { TraderController } from './trader.controller';
import { TraderService } from './trader.service';
import { TraderSymbolClaimService } from './libs/trader-symbol-claim.service';
import { TraderTickerFreshnessService } from './libs/trader-ticker-freshness.service';
import { LoggerService } from '@app/common/logger';
import { KafkaDlqService } from '@app/common';

describe('TraderController', () => {
  let traderController: TraderController;
  let traderService: { handleIndicatorTrigger: jest.Mock };
  let symbolClaimService: { shouldProcess: jest.Mock };
  let freshnessService: { isRecent: jest.Mock };
  let logger: { setContext: jest.Mock; error: jest.Mock };
  let dlq: { publish: jest.Mock };

  const ticker = {
    candle: {
      symbol: 'BTCUSDT',
    },
    producedAt: new Date().toISOString(),
  } as any;

  beforeEach(async () => {
    traderService = { handleIndicatorTrigger: jest.fn() };
    symbolClaimService = { shouldProcess: jest.fn() };
    freshnessService = { isRecent: jest.fn() };
    logger = { setContext: jest.fn(), error: jest.fn() };
    dlq = { publish: jest.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [TraderController],
      providers: [
        { provide: TraderService, useValue: traderService },
        { provide: TraderSymbolClaimService, useValue: symbolClaimService },
        { provide: TraderTickerFreshnessService, useValue: freshnessService },
        { provide: LoggerService, useValue: logger },
        { provide: KafkaDlqService, useValue: dlq },
      ],
    }).compile();

    traderController = app.get<TraderController>(TraderController);
  });

  it('should be defined', () => {
    expect(traderController).toBeDefined();
  });

  describe('trade', () => {
    it('returns early when the ticker is stale', async () => {
      freshnessService.isRecent.mockReturnValue(false);

      await expect(traderController.trade(ticker)).resolves.toBeUndefined();

      expect(symbolClaimService.shouldProcess).not.toHaveBeenCalled();
      expect(traderService.handleIndicatorTrigger).not.toHaveBeenCalled();
    });

    it('returns early when this instance does not own the symbol claim', async () => {
      freshnessService.isRecent.mockReturnValue(true);
      symbolClaimService.shouldProcess.mockResolvedValue(false);

      await expect(traderController.trade(ticker)).resolves.toBeUndefined();

      expect(symbolClaimService.shouldProcess).toHaveBeenCalledWith(ticker);
      expect(traderService.handleIndicatorTrigger).not.toHaveBeenCalled();
    });

    it('logs failure and publishes to DLQ on execution error', async () => {
      const error = new Error('trade failed');

      freshnessService.isRecent.mockReturnValue(true);
      symbolClaimService.shouldProcess.mockResolvedValue(true);
      traderService.handleIndicatorTrigger.mockRejectedValue(error);

      await traderController.trade(ticker);

      expect(logger.error).toHaveBeenCalledWith('Failed to handle indicator trigger', {
        error: 'trade failed',
        stack: error.stack,
        symbol: 'BTCUSDT',
      });
      expect(dlq.publish).toHaveBeenCalledWith('indicator.trigger', ticker, error);
    });
  });
});
