import { Injectable } from '@nestjs/common';
import { HistoryMinuteDataRequest } from './types/historic-data.types';
import { ICandleDoc, Interval } from '@app/contracts';
import { CandleStorageService, MongoDbFactory } from '@app/mongo';
import { BinanceService } from './external/binance';

@Injectable()
export class HistoryProviderService {
  constructor(
    private readonly mongoFactory: MongoDbFactory,
    private readonly binance: BinanceService,
    private readonly candleStorage: CandleStorageService,
  ) {}

  private readonly intervalStepSeconds: Record<string, number> = {
    '1m': 60,
    '5m': 5 * 60,
    '10m': 10 * 60,
    '15m': 15 * 60,
    '30m': 30 * 60,
    '1h': 60 * 60,
    '1d': 24 * 60 * 60,
  };

  async getHistoricData(data: HistoryMinuteDataRequest): Promise<number[]> {
    const symbol = data.symbol.toUpperCase();
    const period = Number(data.period);
    const interval: Interval = data.interval as Interval;
    const timestamp = Number(data.timestamp);

    const timestampId = Math.floor(timestamp / 1000);

    const stepSec = this.intervalStepSeconds[String(interval)] ?? 60;

    const lastId = timestampId - stepSec;
    const firstId = lastId - stepSec * (period - 1);

    const db = this.mongoFactory.getDb(symbol);
    const col = db.collection<ICandleDoc>(interval);

    const docs = await col
      .find({ _id: { $gte: firstId, $lte: lastId } }, { projection: { close: 1, _id: 1 } })
      .sort({ _id: 1 })
      .toArray();

    if (docs.length !== period) {
      // NOTE: Currently fetches from Binance only. A provider-adapter pattern
      // would allow plugging in additional data sources here.
      const fetchedCandles = await this.binance.getKlines({
        symbol,
        interval,
        startTime: firstId * 1000,
        endTime: timestamp - 1,
        limit: period,
      });

      if (fetchedCandles.length !== period) {
        return [];
      }

      await Promise.all(fetchedCandles.map((c) => this.candleStorage.upsert(c, c.interval)));

      return fetchedCandles.map((c) => c.close);
    }

    return docs.map((d) => d.close);
  }
}
