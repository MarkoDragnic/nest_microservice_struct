import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ClientTcpProviderService, GlobalRpcExceptionFilter, PG_WRITE_SERVICE, PG_READ_SERVICE } from '@app/common';

@Module({
  imports: [
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
