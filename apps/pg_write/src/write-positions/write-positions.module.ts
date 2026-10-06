import { Module } from '@nestjs/common';
import { WritePositionsController } from './write-positions.controller';
import { WritePositionsService } from './write-positions.service';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { DatabasePostgresqlModule, Position, PositionsRepository } from '@app/postgres';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Position]), InternalRpcGuardModule],
  controllers: [WritePositionsController],
  providers: [WritePositionsService, PositionsRepository, GlobalRpcExceptionFilter],
  exports: [WritePositionsService],
})
export class WritePositionsModule {}
