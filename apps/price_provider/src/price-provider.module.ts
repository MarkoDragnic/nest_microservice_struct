import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import Joi from 'joi';
import { HealthModule, LoggerModule, redisSchema, internalRpcSchema } from '@app/core';
import { RedisModule } from '@app/redis';
import { MongoLogSinkModule } from '@app/mongo';
import { NormalizeService } from './services/normalize.service';
import { ProviderManagerService } from './services/provider-manager.service';
import { PriceProviderController } from './price-provider.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), 'apps/price_provider/.env'),
        path.resolve(process.cwd(), 'env/logger.env'),
      ],
      validationSchema: Joi.object({
        ...redisSchema,
        REDIS_PASSWORD: Joi.string().required(),
        ...internalRpcSchema,
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PRICE_PROVIDER_TCP_HOST: Joi.string().required(),
        PRICE_PROVIDER_TCP_PORT: Joi.number().required(),
        BINANCE_WEBSOCKET_URL: Joi.string().uri().required(),
        RECONNECT_BASE_MS: Joi.number().default(2000),
        RECONNECT_MAX_MS: Joi.number().default(30000),
        JITTER: Joi.number().min(0).max(1).default(0.2),
      }),
    }),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    RedisModule,
    HealthModule.register({ http: false, tcp: true }),
  ],
  controllers: [PriceProviderController],
  providers: [NormalizeService, ProviderManagerService],
})
export class PriceProviderModule {}
