import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ICandle, Interval } from '@app/contracts';
import { BinanceKline } from './binance.types';
import { IBinanceKlinesParams } from './binance.interface';

@Injectable()
export class BinanceService {
  private readonly baseUrl: string;
  private readonly endpoint: string;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('BINANCE_BASE_URL') ?? 'https://api.binance.com';
    this.endpoint = this.configService.get<string>('BINANCE_KLINES_ENDPOINT') ?? '/api/v3/klines';
  }

  async getKlines(params: IBinanceKlinesParams): Promise<ICandle[]> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${this.endpoint}`;

    const { data } = await firstValueFrom(
      this.http.get<BinanceKline[]>(url, {
        params,
      }),
    );

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const candles: ICandle[] = [];
    for (const k of data) {
      candles.push(this.klineToCandle(k, params.symbol, params.interval));
    }
    candles.sort((a, b) => a.openTime - b.openTime);

    return candles;
  }

  private klineToCandle(k: BinanceKline, symbol: string, interval: Interval): ICandle {
    const openTime = Number(k[0]);
    const closeTime = Number(k[6]);

    return {
      provider: 'binance',
      interval,
      symbol,
      openTime,
      closeTime,
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      ticks: Number(k[8] ?? 0),
    };
  }
}
