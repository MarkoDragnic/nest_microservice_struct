import { Module } from '@nestjs/common';
import { AccountGateService } from './account_gate.service';
import { AccountGateController } from './account_gate.controller';
import { ACCOUNTS_SERVICE, AUTH_SERVICE, ClientTcpProviderService, JwtAuthGuard } from '@app/common';

@Module({
  imports: [
    ClientTcpProviderService.register({
      name: AUTH_SERVICE,
      port: 'AUTH_CLIENT_PORT',
      host: 'AUTH_CLIENT_HOST',
    }),
    ClientTcpProviderService.register({
      name: ACCOUNTS_SERVICE,
      port: 'ACCOUNTS_CLIENT_PORT',
      host: 'ACCOUNTS_CLIENT_HOST',
    }),
  ],
  controllers: [AccountGateController],
  providers: [AccountGateService,  JwtAuthGuard],
})
export class AccountGateModule {}
