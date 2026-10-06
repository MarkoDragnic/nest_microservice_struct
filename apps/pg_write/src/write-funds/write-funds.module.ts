import { Module } from '@nestjs/common';
import { WriteFundsService } from './write-funds.service';
import { WriteFundsController } from './write-funds.controller';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { DatabasePostgresqlModule, Funds, FundsRepository } from '@app/postgres';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Funds]), InternalRpcGuardModule],
  controllers: [WriteFundsController],
  providers: [WriteFundsService, FundsRepository, GlobalRpcExceptionFilter],
  exports: [WriteFundsService],
})
export class WriteFundsModule {}
