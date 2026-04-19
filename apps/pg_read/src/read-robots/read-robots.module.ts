import { Module } from '@nestjs/common';
import { ReadRobotsController } from './read-robots.controller';
import { Account, DatabasePostgresqlModule, Funds, GlobalRpcExceptionFilter, Instrument, Robot, RobotsRepository, User } from '@app/common';
import { ReadRobotsService } from './read-robots.service';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Robot, User, Account, Funds, Instrument])],
  controllers: [ReadRobotsController],
  providers: [ReadRobotsService, RobotsRepository, GlobalRpcExceptionFilter],
  exports: [ReadRobotsService],
})
export class ReadRobotsModule {}
