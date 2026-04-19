import { Injectable } from '@nestjs/common';
import { ICandleWithIndicators, IOpenIndicators } from '@app/common';
import { HlService, RsiService } from '../indicators';

@Injectable()
export class TraderOpenRulesService {
  constructor(
    private readonly rsi: RsiService,
    private readonly hl: HlService,
  ) {}

  openWithIndicators(open: IOpenIndicators, candle: ICandleWithIndicators): boolean {
    const rsiTriggered = this.rsi.isTriggered(open?.rsi, candle);
    const hlTriggered = this.hl.isTriggered(open?.hl, candle);

    return rsiTriggered || hlTriggered;
  }
}
