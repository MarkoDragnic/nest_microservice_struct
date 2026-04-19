import { Interval } from '@app/common';

export interface IBinanceKlinesParams {
  symbol: string;
  interval: Interval;
  startTime: number;
  endTime: number;
  limit: number;
}
