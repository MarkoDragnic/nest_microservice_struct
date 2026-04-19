import { Injectable } from '@nestjs/common';
import { ICloseIndicators } from '@app/common';
import { ProfitTargetService } from './profit-target.service';

@Injectable()
export class MinProfitService {
  constructor(private readonly targets: ProfitTargetService) {}

  isSatisfied(close: ICloseIndicators, entryPrice: number, price: number): boolean {
    const rule = close?.min_profit;
    if (!rule?.enabled) return true;
    const target = this.targets.calculateTargetPriceAboveEntry(entryPrice, rule.factor, rule.value);
    return Number.isFinite(target) && price >= target;
  }
}
