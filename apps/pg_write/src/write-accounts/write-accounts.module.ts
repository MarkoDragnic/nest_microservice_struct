import { Module } from '@nestjs/common';
import { WriteAccountsController } from './write-accounts.controller';
import { WriteAccountsService } from './write-accounts.service';

import { AccountsRepository, DatabasePostgresqlModule, GlobalRpcExceptionFilter } from '@app/common';
import { Account } from '@app/common/models';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([Account])],
  controllers: [WriteAccountsController],
  providers: [WriteAccountsService, AccountsRepository, GlobalRpcExceptionFilter],
  exports: [WriteAccountsService],
})
export class WriteAccountsModule {}
