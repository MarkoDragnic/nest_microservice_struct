import { Module } from '@nestjs/common';
import { RobotGateController } from './robot_gate.controller';
import { RobotGateService } from './robot_gate.service';
import { AUTH_SERVICE, ClientTcpProviderService, JwtAuthGuard, OwnRobotGuard, PG_READ_SERVICE, ROBOTS_SERVICE } from '@app/common';

@Module({
  imports: [
    ClientTcpProviderService.register({
      name: AUTH_SERVICE,
      port: 'AUTH_CLIENT_PORT',
      host: 'AUTH_CLIENT_HOST',
    }),
    ClientTcpProviderService.register({
      name: ROBOTS_SERVICE,
      port: 'ROBOTS_CLIENT_PORT',
      host: 'ROBOTS_CLIENT_HOST',
    }),
    ClientTcpProviderService.register({
      name: PG_READ_SERVICE,
      port: 'PG_READ_CLIENT_PORT',
      host: 'PG_READ_CLIENT_HOST',
    }),
  ],
  controllers: [RobotGateController],
  providers: [RobotGateService, OwnRobotGuard, JwtAuthGuard],
})
export class RobotGateModule {}
