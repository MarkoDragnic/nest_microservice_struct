import { Module } from '@nestjs/common';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { DatabasePostgresqlModule, Funds, Instrument, Robot, RobotsRepository, User } from '@app/postgres';
import { WriteRobotController } from './write-robots.controller';
import { WriteRobotsService } from './write-robots.service';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Robot, User, Funds, Instrument]), InternalRpcGuardModule],
  controllers: [WriteRobotController],
  providers: [WriteRobotsService, RobotsRepository, GlobalRpcExceptionFilter],
  exports: [WriteRobotsService],
})
export class WriteRobotsModule {}
