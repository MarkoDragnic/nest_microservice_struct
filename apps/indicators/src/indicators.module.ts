import Joi from 'joi';
import path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';
import {
  CALCULATOR_SERVICE,
  GlobalRpcExceptionFilter,
  HealthModule,
  HISTORY_SERVICE,
  TRADER_SERVICE,
  ClientTcpProviderService,
  DatabaseMongooseModule,
  LoggerModule,
  MongoLogSinkModule,
  IndicatorsRedisRepository,
  RedisModule,
  KafkaClientModule,
  KafkaDlqModule,
  redisSchema,
  kafkaSchema,
  mongoDbSchema,
  internalRpcSchema,
} from '@app/common';
import { RsiService } from './indicators/rsi.service';
import { HLService } from './indicators/hl.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), 'apps/indicators/.env'), path.resolve(process.cwd(), 'env/logger.env')],
      validationSchema: Joi.object({
        ...redisSchema,
        REDIS_PASSWORD: Joi.string().required(),
        ...kafkaSchema,
        KAFKA_CONSUMER_GROUP: Joi.string().optional().default('indicators-consumer'),
        ...mongoDbSchema,
        ...internalRpcSchema,
        INSTANCE_ID: Joi.string().optional().default('marko-calculator-1'),
        HISTORY_CLIENT_HOST: Joi.string().required(),
        HISTORY_CLIENT_PORT: Joi.number().required(),
        INDICATORS_TCP_HOST: Joi.string().required(),
        INDICATORS_TCP_PORT: Joi.number().required(),
      }),
    }),
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    DatabaseMongooseModule,
    RedisModule,
    KafkaClientModule.register({ name: CALCULATOR_SERVICE }),
    KafkaClientModule.register({ name: TRADER_SERVICE }),
    KafkaDlqModule.register(),
    ClientTcpProviderService.register({
      name: HISTORY_SERVICE,
      port: 'HISTORY_CLIENT_PORT',
      host: 'HISTORY_CLIENT_HOST',
    }),
  ],
  controllers: [IndicatorsController],
  providers: [IndicatorsService, IndicatorsRedisRepository, RsiService, HLService, GlobalRpcExceptionFilter],
})
export class IndicatorsModule {}
