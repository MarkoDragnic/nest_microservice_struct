import { Module } from '@nestjs/common';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import Joi from 'joi';
import {
  GlobalRpcExceptionFilter,
  InternalRpcGuardModule,
  HealthModule,
  LoggerModule,
  kafkaSchema,
  internalRpcSchema,
} from '@app/core';
import {
  ClientKafkaProviderModule,
  ClientTcpProviderService,
  NOTIFICATION_SERVICE,
  PG_WRITE_SERVICE,
  PG_READ_SERVICE,
} from '@app/messaging';
import { MongoLogSinkModule } from '@app/mongo';
import { PositionNotificationService } from './position-notification.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), 'apps/positions/.env'), path.resolve(process.cwd(), 'env/logger.env')],
      validationSchema: Joi.object({
        ...kafkaSchema,
        ...internalRpcSchema,
        INSTANCE_ID: Joi.string().required(),
        POSITION_TCP_HOST: Joi.string().required(),
        POSITION_TCP_PORT: Joi.number().required(),
        PG_WRITE_TCP_HOST: Joi.string().required(),
        PG_WRITE_TCP_PORT: Joi.number().required(),
        PG_READ_TCP_HOST: Joi.string().required(),
        PG_READ_TCP_PORT: Joi.number().required(),
      }),
    }),
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    InternalRpcGuardModule,
    ClientKafkaProviderModule.register({
      name: NOTIFICATION_SERVICE,
      clientId: 'INSTANCE_ID',
      groupId: 'KAFKA_CONSUMER_GROUP',
      brokers: 'KAFKA_BROKERS',
    }),
    ClientTcpProviderService.register({
      name: PG_WRITE_SERVICE,
      port: 'PG_WRITE_TCP_PORT',
      host: 'PG_WRITE_TCP_HOST',
    }),
    ClientTcpProviderService.register({
      name: PG_READ_SERVICE,
      port: 'PG_READ_TCP_PORT',
      host: 'PG_READ_TCP_HOST',
    }),
  ],
  controllers: [PositionsController],
  providers: [PositionsService, PositionNotificationService, GlobalRpcExceptionFilter],
})
export class PositionsModule {}
