import { Module } from '@nestjs/common';
import { WriteAccountsController } from './write-accounts.controller';
import { WriteAccountsService } from './write-accounts.service';

import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { AccountsRepository, DatabasePostgresqlModule, Account } from '@app/postgres';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Account]), InternalRpcGuardModule],
  controllers: [WriteAccountsController],
  providers: [WriteAccountsService, AccountsRepository, GlobalRpcExceptionFilter],
  exports: [WriteAccountsService],
})
export class WriteAccountsModule {}
