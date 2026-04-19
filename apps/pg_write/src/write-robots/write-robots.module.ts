import { Module } from '@nestjs/common';
import { DatabasePostgresqlModule, Funds, GlobalRpcExceptionFilter, Instrument, Robot, RobotsRepository, User } from '@app/common';
import { WriteRobotController } from './write-robots.controller';
import { WriteRobotsService } from './write-robots.service';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Robot, User, Funds, Instrument])],
  controllers: [WriteRobotController],
  providers: [WriteRobotsService, RobotsRepository, GlobalRpcExceptionFilter],
  exports: [WriteRobotsService],
})
export class WriteRobotsModule {}
