import { Module } from '@nestjs/common';
import { RobotsController } from './robots.controller';
import { RobotsService } from './robots.service';
import {
  ClientTcpProviderService,
  GeneralService,
  GlobalRpcExceptionFilter,
  InternalRpcGuardModule,
  HealthModule,
  IndicatorsRedisRepository,
  PG_WRITE_SERVICE,
  PG_READ_SERVICE,
  RedisModule,
  LoggerModule,
  MongoLogSinkModule,
  redisSchema,
  internalRpcSchema,
} from '@app/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import Joi from 'joi';
import { RobotIndicatorsService } from './robot-indicators.service';

@Module({
  imports: [
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    InternalRpcGuardModule,
    RedisModule,
    ConfigModule.forRoot({
      envFilePath: [path.resolve(process.cwd(), 'apps/robots/.env')],
      isGlobal: true,
      validationSchema: Joi.object({
        ...redisSchema,
        REDIS_PASSWORD: Joi.string().required(),
        ...internalRpcSchema,
        ROBOTS_TCP_HOST: Joi.string().required(),
        ROBOTS_TCP_PORT: Joi.number().required(),
        PG_WRITE_TCP_HOST: Joi.string().required(),
        PG_WRITE_TCP_PORT: Joi.number().required(),
        PG_READ_TCP_HOST: Joi.string().required(),
        PG_READ_TCP_PORT: Joi.number().required(),
      }),
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
  controllers: [RobotsController],
  providers: [RobotsService, RobotIndicatorsService, IndicatorsRedisRepository, GeneralService, GlobalRpcExceptionFilter],
})
export class RobotsModule {}
