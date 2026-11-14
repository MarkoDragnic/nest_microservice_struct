import { Module } from '@nestjs/common';
import { ReadRobotsController } from './read-robots.controller';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { Account, DatabasePostgresqlModule, Funds, Instrument, Robot, RobotsRepository, User } from '@app/postgres';
import { ReadRobotsService } from './read-robots.service';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Robot, User, Account, Funds, Instrument]), InternalRpcGuardModule],
  controllers: [ReadRobotsController],
  providers: [ReadRobotsService, RobotsRepository, GlobalRpcExceptionFilter],
  exports: [ReadRobotsService],
})
export class ReadRobotsModule {}
