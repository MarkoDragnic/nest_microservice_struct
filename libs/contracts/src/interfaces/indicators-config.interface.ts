import type { HlRule, ProfitFactor, RsiRule } from '../types/indicators/indicators';

export interface IRsiIndicator {
  enabled: boolean;
  period: number;
  rule: RsiRule;
  value: number;
}

export interface IHlIndicator {
  enabled: boolean;
  period: number;
  rule: HlRule;
  value: number;
}

export interface IProfitIndicator {
  enabled: boolean;
  factor: ProfitFactor;
  value: number;
}

export interface IOpenIndicators {
  rsi: IRsiIndicator;
  hl: IHlIndicator;
}

export interface ICloseIndicators {
  take_profit: IProfitIndicator;
  stop_lose: IProfitIndicator;
  min_profit: IProfitIndicator;
  rsi: IRsiIndicator;
  hl: IHlIndicator;
}

export interface IIndicatorsConfig {
  open: IOpenIndicators;
  close: ICloseIndicators;
}
