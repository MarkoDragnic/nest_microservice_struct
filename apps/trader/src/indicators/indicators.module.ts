import { Module } from '@nestjs/common';
import { HlService } from './hl.service';
import { MinProfitService } from './min-profit.service';
import { ProfitTargetService } from './profit-target.service';
import { RsiService } from './rsi.service';
import { StopLossService } from './stop-loss.service';
import { TakeProfitService } from './take-profit.service';

@Module({
  providers: [ProfitTargetService, TakeProfitService, StopLossService, MinProfitService, RsiService, HlService],
  exports: [ProfitTargetService, TakeProfitService, StopLossService, MinProfitService, RsiService, HlService],
})
export class IndicatorsModule {}
