import { Module } from '@nestjs/common';
import { ReadUserController } from './read-user.controller';
import { ReadUserService } from './read-user.service';
import { DatabasePostgresqlModule, GlobalRpcExceptionFilter, InternalRpcGuardModule, User, UsersRepository } from '@app/common';
import { Entity } from 'typeorm';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([User]), InternalRpcGuardModule],
  controllers: [ReadUserController],
  providers: [ReadUserService, UsersRepository, GlobalRpcExceptionFilter],
  exports: [ReadUserService],
})
export class ReadUserModule {}
