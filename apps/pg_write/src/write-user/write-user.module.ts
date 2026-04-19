import { Module } from '@nestjs/common';
import { WriteUserService } from './write-user.service';
import { WriteUserController } from './write-user.controller';
import { DatabasePostgresqlModule, GlobalRpcExceptionFilter, User, UsersRepository } from '@app/common';

@Module({
  imports: [DatabasePostgresqlModule.forFeature([User])],
  controllers: [WriteUserController],
  providers: [WriteUserService, UsersRepository, GlobalRpcExceptionFilter],
  exports: [WriteUserService],
})
export class WriteUserModule {}
