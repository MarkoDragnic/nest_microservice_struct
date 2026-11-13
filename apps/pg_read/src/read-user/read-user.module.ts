import { Module } from '@nestjs/common';
import { ReadUserController } from './read-user.controller';
import { ReadUserService } from './read-user.service';
import { GlobalRpcExceptionFilter, InternalRpcGuardModule } from '@app/core';
import { DatabasePostgresqlModule, User, UsersRepository } from '@app/postgres';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([User]), InternalRpcGuardModule],
  controllers: [ReadUserController],
  providers: [ReadUserService, UsersRepository, GlobalRpcExceptionFilter],
  exports: [ReadUserService],
})
export class ReadUserModule {}
