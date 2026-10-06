import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import Joi from 'joi';
import { ClientTcpProviderService, GlobalRpcExceptionFilter, InternalRpcGuardModule, HealthModule, PG_WRITE_SERVICE, LoggerModule, MongoLogSinkModule, internalRpcSchema } from '@app/common';
import { CryptoService } from './crypto.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), 'apps/accounts/.env'), path.resolve(process.cwd(), 'env/logger.env')],
      validationSchema: Joi.object({
        ...internalRpcSchema,
        ACCOUNT_TCP_HOST: Joi.string().required(),
        ACCOUNT_TCP_PORT: Joi.string().required(),
        PG_WRITE_TCP_HOST: Joi.string().required(),
        PG_WRITE_TCP_PORT: Joi.number().required(),
        ENCRYPTION_CREDENTIAL_KEY: Joi.string().length(64).hex().required(),
      }),
    }),
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    InternalRpcGuardModule,
    ClientTcpProviderService.register({
      name: PG_WRITE_SERVICE,
      port: 'PG_WRITE_TCP_PORT',
      host: 'PG_WRITE_TCP_HOST',
    }),
  ],
  controllers: [AccountsController],
  providers: [AccountsService, CryptoService, GlobalRpcExceptionFilter],
})
export class AccountsModule {}
