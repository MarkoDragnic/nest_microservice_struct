import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import Joi from 'joi';
import { CommonLibsModule, HealthModule, LoggerModule, internalRpcSchema } from '@app/core';
import { MongoLogSinkModule } from '@app/mongo';
import { DatabasePostgresqlModule, postgresSchema } from '@app/postgres';
import { WriteAccountsModule } from './write-accounts/write-accounts.module';
import { WriteRobotsModule } from './write-robots/write-robots.module';
import { WritePositionsModule } from './write-positions/write-positions.module';
import { WriteUserModule } from './write-user/write-user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), 'apps/pg_write/.env'),
        path.resolve(process.cwd(), 'env/logger.env'),
        path.resolve(process.cwd(), 'env/postgres.env'),
      ],
      validationSchema: Joi.object({
        ...internalRpcSchema,
        ...postgresSchema,
        PG_WRITE_TCP_HOST: Joi.string().required(),
        PG_WRITE_TCP_PORT: Joi.string().required(),
      }),
    }),
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    CommonLibsModule,
    DatabasePostgresqlModule,
    WriteAccountsModule,
    WriteRobotsModule,
    WritePositionsModule,
    WriteUserModule,
  ],
})
export class PgWriteModule {}
