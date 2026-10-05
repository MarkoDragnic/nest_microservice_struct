import { Module } from '@nestjs/common';
import { WriteUserService } from './write-user.service';
import { WriteUserController } from './write-user.controller';
import { DatabasePostgresqlModule, GlobalRpcExceptionFilter, InternalRpcGuardModule, User, UsersRepository } from '@app/common';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([User]), InternalRpcGuardModule],
  controllers: [WriteUserController],
  providers: [WriteUserService, UsersRepository, GlobalRpcExceptionFilter],
  exports: [WriteUserService],
})
export class WriteUserModule {}
