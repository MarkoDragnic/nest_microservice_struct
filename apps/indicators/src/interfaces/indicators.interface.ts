import { IndicatorsResponse } from '../types/indicators.types';

export interface IIndicators {
  update(
    symbol: string,
    period: number,
    price: number,
    timestamp: number,
    interval: string,
  ): Promise<IndicatorsResponse>;
}
