import { Injectable } from '@nestjs/common';
import { ICloseIndicators } from '@app/common';
import { ProfitTargetService } from './profit-target.service';

@Injectable()
export class TakeProfitService {
  constructor(private readonly targets: ProfitTargetService) {}

  isHit(close: ICloseIndicators, entryPrice: number, price: number): boolean {
    const rule = close?.take_profit;
    if (!rule?.enabled) return false;
    const target = this.targets.calculateTargetPriceAboveEntry(entryPrice, rule.factor, rule.value);
    return Number.isFinite(target) && price >= target;
  }
}
