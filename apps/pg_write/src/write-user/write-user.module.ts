import { Module } from '@nestjs/common';
import { WriteUserService } from './write-user.service';
import { WriteUserController } from './write-user.controller';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { DatabasePostgresqlModule, User, UsersRepository } from '@app/postgres';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([User]), InternalRpcGuardModule],
  controllers: [WriteUserController],
  providers: [WriteUserService, UsersRepository, GlobalRpcExceptionFilter],
  exports: [WriteUserService],
})
export class WriteUserModule {}
