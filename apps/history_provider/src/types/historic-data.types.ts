import { Interval } from '@app/contracts';

export type HistoryMinuteDataRequest = {
  symbol: string;
  period: number;
  interval: Interval;
  timestamp: number;
};
