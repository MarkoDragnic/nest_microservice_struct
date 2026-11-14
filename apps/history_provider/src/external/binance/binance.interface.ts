import { Interval } from '@app/contracts';

export interface IBinanceKlinesParams {
  symbol: string;
  interval: Interval;
  startTime: number;
  endTime: number;
  limit: number;
}
