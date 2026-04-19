import { Module } from '@nestjs/common';
import { WritePositionsController } from './write-positions.controller';
import { WritePositionsService } from './write-positions.service';
import { DatabasePostgresqlModule, GlobalRpcExceptionFilter, Position, PositionsRepository } from '@app/common';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Position])],
  controllers: [WritePositionsController],
  providers: [WritePositionsService, PositionsRepository, GlobalRpcExceptionFilter],
  exports: [WritePositionsService],
})
export class WritePositionsModule {}
