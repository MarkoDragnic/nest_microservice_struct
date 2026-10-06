import { Injectable } from '@nestjs/common';
import { ICandleWithIndicators, HlRule } from '@app/contracts';

type HlIndicatorConfig = {
  enabled: boolean;
  period: number;
  rule: string;
  value: number;
};

@Injectable()
export class HlService {
  isTriggered(indicator: HlIndicatorConfig | undefined, candle: ICandleWithIndicators): boolean {
    if (!indicator?.enabled) return false;

    const hl = candle?.indicators?.hl?.[indicator.period];
    if (!hl || !Number.isFinite(hl.high) || !Number.isFinite(hl.low)) return false;

    const price = candle.close;
    if (!Number.isFinite(price)) return false;

    switch (String(indicator.rule).toLowerCase()) {
      case HlRule.GREATER:
        return price >= hl.high;
      case HlRule.LESS:
        return price <= hl.low;
      default:
        return false;
    }
  }
}
