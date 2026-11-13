import { Injectable } from '@nestjs/common';
import { Connection } from 'mongoose';
import { Interval } from '@app/contracts/types';
import { ICandle, ICandleDoc, ICandleWithIndicators } from '@app/contracts/interfaces';
import { MongoDbFactory } from '../mongo-db.factory';

@Injectable()
export class CandleStorageService {
  constructor(private readonly mongoFactory: MongoDbFactory) {}

  async upsert(candle: ICandle | ICandleWithIndicators, interval: Interval): Promise<void> {
    const symbolDbName = candle.symbol.toUpperCase();
    const db: Connection = this.mongoFactory.getDb(symbolDbName);

    const col = db.collection<ICandleDoc>(interval);
    const openTimeSec = Math.floor(candle.openTime / 1000);

    await col.updateOne(
      { _id: openTimeSec },
      {
        $set: {
          ...candle,
        },
      },
      { upsert: true },
    );
  }
}
