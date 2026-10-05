import { Module } from '@nestjs/common';
import { WriteFundsService } from './write-funds.service';
import { WriteFundsController } from './write-funds.controller';
import { DatabasePostgresqlModule, Funds, FundsRepository, GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/common';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Funds]), InternalRpcGuardModule],
  controllers: [WriteFundsController],
  providers: [WriteFundsService, FundsRepository, GlobalRpcExceptionFilter],
  exports: [WriteFundsService],
})
export class WriteFundsModule {}
