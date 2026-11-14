import { Injectable } from '@nestjs/common';
import { ICandle, INormalizedTick } from '@app/contracts';

type CandleState = {
  provider: string;
  symbol: string;
  openTime: number;

  open: number;
  high: number;
  low: number;
  close: number;

  firstTs: number;
  lastTs: number;
  ticks: number;
};

@Injectable()
export class CandleAggregatorService {
  private readonly states = new Map<string, CandleState>();

  aggregate(tick: INormalizedTick): ICandle | null {
    const key = tick.symbol;
    const minuteStart = Math.floor(tick.ts / 60000) * 60000;

    // NOTE: Using ask price for candle aggregation. Mid-price ((bid+ask)/2) is
    // an alternative but ask aligns with the fill price for market-buy orders.
    const price = tick.ask;

    const state = this.states.get(key);

    // fist tick
    if (!state) {
      this.states.set(key, {
        provider: tick.provider,
        symbol: tick.symbol,
        openTime: minuteStart,
        open: price,
        high: price,
        low: price,
        close: price,
        ticks: 1,
        firstTs: tick.ts,
        lastTs: tick.ts,
      });
      return null;
    }

    if (minuteStart < state.openTime) {
      return null;
    }

    if (minuteStart === state.openTime) {
      state.high = Math.max(state.high, price);
      state.low = Math.min(state.low, price);
      state.ticks += 1;

      if (tick.ts < state.firstTs) {
        state.firstTs = tick.ts;
        state.open = price;
      }
      if (tick.ts > state.lastTs) {
        state.lastTs = tick.ts;
        state.close = price;
      }
      return null;
    }

    const closed: ICandle = {
      provider: state.provider,
      symbol: state.symbol,
      openTime: state.openTime,
      closeTime: state.openTime + 60000 - 1,
      open: state.open,
      high: state.high,
      low: state.low,
      interval: '1m',
      close: state.close,
      ticks: state.ticks,
    };

    this.states.set(key, {
      provider: tick.provider,
      symbol: tick.symbol,
      openTime: minuteStart,
      open: price,
      high: price,
      low: price,
      close: price,
      firstTs: tick.ts,
      lastTs: tick.ts,
      ticks: 1,
    });

    return closed;
  }
}
