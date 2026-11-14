import { Injectable } from '@nestjs/common';
import { ICandleWithIndicators, RsiRule } from '@app/contracts';

type RsiIndicatorConfig = {
  enabled: boolean;
  period: number;
  rule: string;
  value: number;
};

@Injectable()
export class RsiService {
  isTriggered(indicator: RsiIndicatorConfig | undefined, candle: ICandleWithIndicators): boolean {
    if (!indicator?.enabled) return false;

    const rsiValue = candle.indicators.rsi?.[indicator.period];
    if (!rsiValue) return false;

    const current = rsiValue.c;
    const previous = rsiValue.p;

    const rule = String(indicator.rule).toLowerCase();
    const value = Number(indicator.value);

    if (!Number.isFinite(value)) return false;

    switch (rule) {
      case RsiRule.CROSSES_UP:
        return previous < value && current >= value;
      case RsiRule.CROSSES_DOWN:
        return previous > value && current <= value;
      case RsiRule.GREATER:
        return current >= value;
      case RsiRule.LESS:
        return current <= value;
      default:
        return false;
    }
  }
}
