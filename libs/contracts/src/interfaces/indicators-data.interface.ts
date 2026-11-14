import { ICandle } from './normalized.interface';

export interface IHLValue {
  high: number;
  low: number;
}

export interface IIndicatorValueByName {
  rsi: {
    c: number;
    p: number;
  };
  hl: IHLValue;
}

// Nested structure: indicators[indicatorName][period] = value
export type Indicators = Partial<{
  [K in keyof IIndicatorValueByName]: Partial<Record<number, IIndicatorValueByName[K]>>;
}>;

export interface ICandleWithIndicators extends ICandle {
  indicators: Indicators;
}
