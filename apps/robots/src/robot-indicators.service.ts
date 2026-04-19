import { Injectable } from '@nestjs/common';
import { GeneralService, IIndicatorsConfig, IndicatorsValues } from '@app/common';
import { IIndicator } from '@app/common';

@Injectable()
export class RobotIndicatorsService {
  constructor(private readonly generalService: GeneralService) {}

  async activeIndicators(indicators: IIndicatorsConfig | []) {
    const out = new Map<string, Set<number>>();
    for (const [_, value] of Object.entries(indicators)) {
      for (const [key, indicator] of Object.entries(value as IIndicator)) {
        if (this.generalService.isEnumValue(IndicatorsValues, key) && indicator.enabled) {
          const period = indicator.period;
          const periodSet = out.get(key) ?? new Set<number>();
          periodSet.add(period);
          out.set(key, periodSet);
        }
      }
    }
    return Object.fromEntries([...out.entries()].map(([k, set]) => [k, [...set].sort((a, b) => a - b)]));
  }
}
