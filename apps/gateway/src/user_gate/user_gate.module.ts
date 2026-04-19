import { Module } from '@nestjs/common';
import { UserGateService } from './user_gate.service';
import { AUTH_SERVICE, ClientTcpProviderService } from '@app/common';
import { UserGateController } from './user_gate.controller';

@Module({
  imports: [
    ClientTcpProviderService.register({
      name: AUTH_SERVICE,
      port: 'AUTH_CLIENT_PORT',
      host: 'AUTH_CLIENT_HOST',
    }),
  ],
  controllers: [UserGateController],
  providers: [UserGateService],
})
export class UserGateModule {}
