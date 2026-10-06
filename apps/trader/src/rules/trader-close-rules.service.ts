import { Injectable } from '@nestjs/common';
import { ICandleWithIndicators, ICloseIndicators } from '@app/contracts';
import { HlService, MinProfitService, RsiService, StopLossService, TakeProfitService } from '../indicators';

@Injectable()
export class TraderCloseRulesService {
  constructor(
    private readonly takeProfit: TakeProfitService,
    private readonly stopLoss: StopLossService,
    private readonly minProfit: MinProfitService,
    private readonly rsi: RsiService,
    private readonly hl: HlService,
  ) {}

  exitOrders(close: ICloseIndicators, candle: ICandleWithIndicators, entryPrice: number): boolean {
    const price = candle.close;
    if (!Number.isFinite(price) || !Number.isFinite(entryPrice)) return false;

    const takeProfitTriggered = this.takeProfit.isHit(close, entryPrice, price);
    const stopLossTriggered = this.stopLoss.isHit(close, entryPrice, price);

    return takeProfitTriggered || stopLossTriggered;
  }

  exitWithIndicators(close: ICloseIndicators, candle: ICandleWithIndicators, entryPrice: number): boolean {
    const price = candle.close;
    if (!Number.isFinite(price) || !Number.isFinite(entryPrice)) return false;

    if (close?.min_profit?.enabled) {
      const minProfitOk = this.minProfit.isSatisfied(close, entryPrice, price);
      if (!minProfitOk) return false;
    }

    const rsiTriggered = this.rsi.isTriggered(close?.rsi, candle);
    const hlTriggered = this.hl.isTriggered(close?.hl, candle);

    return rsiTriggered || hlTriggered;
  }
}
