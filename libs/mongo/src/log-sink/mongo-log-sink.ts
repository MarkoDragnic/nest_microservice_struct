import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ILogEntry, LogSink } from '@app/core/logger';
import { LogDocument } from './log.schema';

@Injectable()
export class MongoLogSink implements LogSink {
  constructor(@InjectModel(LogDocument.name, 'logger-db') private readonly logModel: Model<LogDocument>) {}

  async write(entry: ILogEntry): Promise<void> {
    await this.logModel.create(entry);
  }
}
