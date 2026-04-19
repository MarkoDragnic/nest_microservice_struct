import { Module } from '@nestjs/common';
import { CandleAggregatorService } from './candle-aggregator.service';
import { CandleProcessedService } from './candle-notification.service';

@Module({
  providers: [CandleAggregatorService, CandleProcessedService],
  exports: [CandleAggregatorService, CandleProcessedService],
})
export class CandleModule {}
