import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InternalRpcGuard } from './internal-rpc.guard';

@Module({
  imports: [ConfigModule],
  providers: [InternalRpcGuard],
  exports: [InternalRpcGuard],
})
export class InternalRpcGuardModule {}
