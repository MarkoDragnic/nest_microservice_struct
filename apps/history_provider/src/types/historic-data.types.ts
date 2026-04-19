import { Interval } from '@app/common';

export type HistoryMinuteDataRequest = {
  symbol: string;
  period: number;
  interval: Interval;
  timestamp: number;
};
