import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import Joi from 'joi';
import { CommonLibsModule, DatabasePostgresqlModule, HealthModule, LoggerModule, MongoLogSinkModule, internalRpcSchema } from '@app/common';
import { ReadRobotsController } from './read-robots/read-robots.controller';
import { ReadRobotsService } from './read-robots/read-robots.service';
import { ReadRobotsModule } from './read-robots/read-robots.module';
import { ReadPositionsModule } from './read-positions/read-positions.module';
import { ReadUserModule } from './read-user/read-user.module';

@Module({
  imports: [
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), 'apps/pg_read/.env')],
      validationSchema: Joi.object({
        ...internalRpcSchema,
        PG_READ_TCP_HOST: Joi.string().required(),
        PG_READ_TCP_PORT: Joi.string().required(),
      }),
    }),
    CommonLibsModule,
    DatabasePostgresqlModule,
    ReadRobotsModule,
    ReadPositionsModule,
    ReadUserModule,
  ],
})
export class PgReadModule {}
