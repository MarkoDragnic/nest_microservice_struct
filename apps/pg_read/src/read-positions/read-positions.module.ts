import { Module } from '@nestjs/common';
import { ReadPositionsService } from './read-positions.service';
import { ReadPositionsController } from './read-positions.controller';
import { GlobalRpcExceptionFilter, DatabasePostgresqlModule, Position, PositionsRepository } from '@app/common';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Position])],
  controllers: [ReadPositionsController],
  providers: [ReadPositionsService, PositionsRepository, GlobalRpcExceptionFilter],
  exports: [ReadPositionsService],
})
export class ReadPositionsModule {}
