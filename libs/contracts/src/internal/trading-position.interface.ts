import type { IIndicatorsConfig } from '../interfaces/indicators-config.interface';

export interface TradingPosition {
  id: string;
  robot: { id: string };
  symbol: string;
  quantity: number;
  entryPrice: number;
  rules?: IIndicatorsConfig;
}
