import { Test, TestingModule } from '@nestjs/testing';
import { TraderCloseRulesService } from './trader-close-rules.service';
import { TakeProfitService, StopLossService, MinProfitService, RsiService, HlService } from '../indicators';
import { ProfitTargetService } from '../indicators/profit-target.service';
import { ICandleWithIndicators, ICloseIndicators, ProfitFactor, RsiRule, HlRule } from '@app/common';

describe('TraderCloseRulesService', () => {
  let service: TraderCloseRulesService;

  const makeCandle = (close: number, indicators: any = {}): ICandleWithIndicators => ({
    provider: 'binance',
    interval: '1m',
    symbol: 'BTCUSDT',
    openTime: 1000,
    closeTime: 2000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    ticks: 10,
    indicators,
  });

  const makeCloseIndicators = (overrides: Partial<ICloseIndicators> = {}): ICloseIndicators => ({
    take_profit: { enabled: false, factor: ProfitFactor.PERCENT, value: 5 },
    stop_lose: { enabled: false, factor: ProfitFactor.PERCENT, value: 3 },
    min_profit: { enabled: false, factor: ProfitFactor.PERCENT, value: 1 },
    rsi: { enabled: false, period: 14, rule: RsiRule.CROSSES_DOWN, value: 70 },
    hl: { enabled: false, period: 20, rule: HlRule.LESS, value: 0 },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraderCloseRulesService,
        TakeProfitService,
        StopLossService,
        MinProfitService,
        RsiService,
        HlService,
        ProfitTargetService,
      ],
    }).compile();

    service = module.get<TraderCloseRulesService>(TraderCloseRulesService);
  });

  describe('exitOrders', () => {
    it('should trigger take-profit when price exceeds target', () => {
      const close = makeCloseIndicators({
        take_profit: { enabled: true, factor: ProfitFactor.PERCENT, value: 5 },
      });
      const entryPrice = 100;
      const candle = makeCandle(106); // 6% above entry → exceeds 5% TP

      expect(service.exitOrders(close, candle, entryPrice)).toBe(true);
    });

    it('should not trigger take-profit when price is below target', () => {
      const close = makeCloseIndicators({
        take_profit: { enabled: true, factor: ProfitFactor.PERCENT, value: 5 },
      });
      const entryPrice = 100;
      const candle = makeCandle(103); // 3% above entry → below 5% TP

      expect(service.exitOrders(close, candle, entryPrice)).toBe(false);
    });

    it('should trigger stop-loss when price drops below target', () => {
      const close = makeCloseIndicators({
        stop_lose: { enabled: true, factor: ProfitFactor.PERCENT, value: 3 },
      });
      const entryPrice = 100;
      const candle = makeCandle(96); // 4% below entry → below 3% SL

      expect(service.exitOrders(close, candle, entryPrice)).toBe(true);
    });

    it('should not trigger when both TP and SL are disabled', () => {
      const close = makeCloseIndicators();
      expect(service.exitOrders(close, makeCandle(200), 100)).toBe(false);
    });

    it('should return false for non-finite prices', () => {
      const close = makeCloseIndicators({
        take_profit: { enabled: true, factor: ProfitFactor.PERCENT, value: 5 },
      });
      expect(service.exitOrders(close, makeCandle(NaN), 100)).toBe(false);
    });

    it('should handle value-based take-profit', () => {
      const close = makeCloseIndicators({
        take_profit: { enabled: true, factor: ProfitFactor.VALUE, value: 10 },
      });
      const entryPrice = 100;
      const candle = makeCandle(111); // entry + 11 > target of 110

      expect(service.exitOrders(close, candle, entryPrice)).toBe(true);
    });
  });

  describe('exitWithIndicators', () => {
    it('should block indicator exit when min_profit is not met', () => {
      const close = makeCloseIndicators({
        min_profit: { enabled: true, factor: ProfitFactor.PERCENT, value: 2 },
        rsi: { enabled: true, period: 14, rule: RsiRule.CROSSES_DOWN, value: 70 },
      });
      const entryPrice = 100;
      // Price below min profit (101 = 1% < 2%), RSI crossing down
      const candle = makeCandle(101, {
        rsi: { 14: { c: 65, p: 75 } },
      });

      expect(service.exitWithIndicators(close, candle, entryPrice)).toBe(false);
    });

    it('should allow indicator exit when min_profit is met and RSI triggers', () => {
      const close = makeCloseIndicators({
        min_profit: { enabled: true, factor: ProfitFactor.PERCENT, value: 2 },
        rsi: { enabled: true, period: 14, rule: RsiRule.CROSSES_DOWN, value: 70 },
      });
      const entryPrice = 100;
      // Price above min profit (103 = 3% > 2%), RSI crossing down
      const candle = makeCandle(103, {
        rsi: { 14: { c: 65, p: 75 } },
      });

      expect(service.exitWithIndicators(close, candle, entryPrice)).toBe(true);
    });

    it('should trigger on HL indicator when price drops below low', () => {
      const close = makeCloseIndicators({
        hl: { enabled: true, period: 20, rule: HlRule.LESS, value: 0 },
      });
      const candle = makeCandle(95, {
        hl: { 20: { high: 110, low: 98 } },
      });

      expect(service.exitWithIndicators(close, candle, 100)).toBe(true);
    });

    it('should return false when no indicators trigger', () => {
      const close = makeCloseIndicators({
        rsi: { enabled: true, period: 14, rule: RsiRule.CROSSES_DOWN, value: 70 },
      });
      const candle = makeCandle(105, {
        rsi: { 14: { c: 75, p: 72 } }, // trending up, not crossing down
      });

      expect(service.exitWithIndicators(close, candle, 100)).toBe(false);
    });
  });
});
