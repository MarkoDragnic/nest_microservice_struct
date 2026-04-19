import { Module } from '@nestjs/common';
import { HLService } from './hl.service';
import { RsiService } from './rsi.service';

@Module({
  providers: [RsiService, HLService],
  exports: [RsiService, HLService],
})
export class IndicatorsEngineModule {}
