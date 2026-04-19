import { Injectable } from '@nestjs/common';
import { BinanceData, INormalizedTick } from '@app/common';

@Injectable()
export class NormalizeService {
  binanceNormalization(data: BinanceData): string {
    if (!data.s) {
      return '';
    }
    const bid = Number(data.b);
    const ask = Number(data.a);
    const decimals = Math.max(this.decimalsOf(data.b), this.decimalsOf(data.a));
    const normalizedData: INormalizedTick = {
      seq: data.u,
      provider: 'binance',
      symbol: data.s,
      ts: Date.now(),
      bid,
      ask,
      bidSize: Number(data.B),
      askSize: Number(data.A),
      mid: this.roundTo((bid + ask) / 2, decimals),
      spread: this.roundTo(ask - bid, decimals),
    };
    return JSON.stringify(normalizedData);
  }

  private decimalsOf(s: string): number {
    const i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
  }

  private roundTo(value: number, decimals: number): number {
    const f = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * f) / f;
  }
}
