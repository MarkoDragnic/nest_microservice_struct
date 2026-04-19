export enum IndicatorState {
  STABLE = 'stable',
  LOADING = 'loading',
}

export type IndicatorsResponse = {
  symbol: string;
  status: IndicatorState;
  period: number;
  data: IndicatorsValueMessage;
};

type IndicatorsValueMessage = {
  error?: string;
  value?: {
    high?: number;
    low?: number;
    rsi?: {
      c: number;
      p: number;
    };
  };
};
