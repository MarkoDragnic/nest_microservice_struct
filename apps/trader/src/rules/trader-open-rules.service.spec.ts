import { Test, TestingModule } from '@nestjs/testing';
import { TraderOpenRulesService } from './trader-open-rules.service';
import { RsiService, HlService } from '../indicators';
import { ICandleWithIndicators, IOpenIndicators, RsiRule, HlRule } from '@app/contracts';

describe('TraderOpenRulesService', () => {
  let service: TraderOpenRulesService;

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

  const makeOpenIndicators = (overrides: Partial<IOpenIndicators> = {}): IOpenIndicators => ({
    rsi: { enabled: false, period: 14, rule: RsiRule.CROSSES_UP, value: 30 },
    hl: { enabled: false, period: 20, rule: HlRule.GREATER, value: 0 },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TraderOpenRulesService, RsiService, HlService],
    }).compile();

    service = module.get<TraderOpenRulesService>(TraderOpenRulesService);
  });

  describe('openWithIndicators', () => {
    it('should trigger on RSI crosses up', () => {
      const open = makeOpenIndicators({
        rsi: { enabled: true, period: 14, rule: RsiRule.CROSSES_UP, value: 30 },
      });
      const candle = makeCandle(100, {
        rsi: { 14: { c: 32, p: 28 } }, // crossed above 30
      });

      expect(service.openWithIndicators(open, candle)).toBe(true);
    });

    it('should not trigger when RSI does not cross', () => {
      const open = makeOpenIndicators({
        rsi: { enabled: true, period: 14, rule: RsiRule.CROSSES_UP, value: 30 },
      });
      const candle = makeCandle(100, {
        rsi: { 14: { c: 25, p: 20 } }, // still below 30
      });

      expect(service.openWithIndicators(open, candle)).toBe(false);
    });

    it('should trigger on HL greater when price exceeds high', () => {
      const open = makeOpenIndicators({
        hl: { enabled: true, period: 20, rule: HlRule.GREATER, value: 0 },
      });
      const candle = makeCandle(112, {
        hl: { 20: { high: 110, low: 90 } },
      });

      expect(service.openWithIndicators(open, candle)).toBe(true);
    });

    it('should not trigger on HL greater when price is below high', () => {
      const open = makeOpenIndicators({
        hl: { enabled: true, period: 20, rule: HlRule.GREATER, value: 0 },
      });
      const candle = makeCandle(105, {
        hl: { 20: { high: 110, low: 90 } },
      });

      expect(service.openWithIndicators(open, candle)).toBe(false);
    });

    it('should return false when all indicators are disabled', () => {
      const open = makeOpenIndicators();
      const candle = makeCandle(100, {
        rsi: { 14: { c: 32, p: 28 } },
        hl: { 20: { high: 50, low: 30 } },
      });

      expect(service.openWithIndicators(open, candle)).toBe(false);
    });

    it('should return false when candle has no indicator data', () => {
      const open = makeOpenIndicators({
        rsi: { enabled: true, period: 14, rule: RsiRule.CROSSES_UP, value: 30 },
      });
      const candle = makeCandle(100, {}); // no rsi data for period 14

      expect(service.openWithIndicators(open, candle)).toBe(false);
    });

    it('should trigger when either RSI or HL triggers (OR logic)', () => {
      const open = makeOpenIndicators({
        rsi: { enabled: true, period: 14, rule: RsiRule.CROSSES_UP, value: 30 },
        hl: { enabled: true, period: 20, rule: HlRule.GREATER, value: 0 },
      });
      // RSI triggers, HL does not
      const candle = makeCandle(100, {
        rsi: { 14: { c: 32, p: 28 } },
        hl: { 20: { high: 110, low: 90 } },
      });

      expect(service.openWithIndicators(open, candle)).toBe(true);
    });
  });
});
