import { Module } from '@nestjs/common';
import { ReadPositionsService } from './read-positions.service';
import { ReadPositionsController } from './read-positions.controller';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule, DatabasePostgresqlModule, Position, PositionsRepository } from '@app/common';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Position]), InternalRpcGuardModule],
  controllers: [ReadPositionsController],
  providers: [ReadPositionsService, PositionsRepository, GlobalRpcExceptionFilter],
  exports: [ReadPositionsService],
})
export class ReadPositionsModule {}
