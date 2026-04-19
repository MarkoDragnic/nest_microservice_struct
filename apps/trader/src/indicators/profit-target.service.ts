import { Injectable } from '@nestjs/common';
import { ProfitFactor } from '@app/common';

@Injectable()
export class ProfitTargetService {
  calculateTargetPriceAboveEntry(entryPrice: number, factor: string, value: number): number {
    const entryPriceNumber = Number(entryPrice);
    const valueNumber = Number(value);
    const factorNormalized = String(factor).toLowerCase();

    if (!Number.isFinite(entryPriceNumber) || !Number.isFinite(valueNumber)) {
      return NaN;
    }

    if (factorNormalized === ProfitFactor.VALUE) {
      return entryPriceNumber + valueNumber;
    }

    if (factorNormalized === ProfitFactor.PERCENT) {
      return entryPriceNumber * (1 + valueNumber / 100);
    }

    return NaN;
  }

  calculateTargetPriceBelowEntry(entryPrice: number, factor: string, value: number): number {
    const entryPriceNumber = Number(entryPrice);
    const valueNumber = Number(value);
    const factorNormalized = String(factor).toLowerCase();

    if (!Number.isFinite(entryPriceNumber) || !Number.isFinite(valueNumber)) {
      return NaN;
    }

    if (factorNormalized === ProfitFactor.VALUE) {
      return entryPriceNumber - valueNumber;
    }

    if (factorNormalized === ProfitFactor.PERCENT) {
      return entryPriceNumber * (1 - valueNumber / 100);
    }

    return NaN;
  }
}
