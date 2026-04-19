import { Interval, ProviderId } from '../types/normalized.types';

export interface INormalizedTick {
  seq?: number;
  provider: ProviderId;
  symbol: string;
  ts: number;

  bid: number;
  ask: number;
  bidSize?: number;
  askSize?: number;

  mid?: number;
  spread?: number;
}

export interface ICandle {
  provider: ProviderId;
  interval: Interval;
  symbol: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  ticks: number;
}

export interface ICandleDoc extends ICandle {
  _id: number;
}
