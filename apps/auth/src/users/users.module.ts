import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { ClientTcpProviderService, PG_WRITE_SERVICE, PG_READ_SERVICE } from '@app/messaging';

@Module({
  imports: [
    InternalRpcGuardModule,
    ClientTcpProviderService.register({
      name: PG_WRITE_SERVICE,
      port: 'PG_WRITE_TCP_PORT',
      host: 'PG_WRITE_TCP_HOST',
    }),
    ClientTcpProviderService.register({
      name: PG_READ_SERVICE,
      port: 'PG_READ_TCP_PORT',
      host: 'PG_READ_TCP_HOST',
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, GlobalRpcExceptionFilter],
  exports: [UsersService],
})
export class UsersModule {}
