import { Module } from '@nestjs/common';
import { HistoryProviderController } from './history_provider.controller';
import { HistoryProviderService } from './history_provider.service';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { DatabaseMongooseModule, GlobalRpcExceptionFilter, InternalRpcGuardModule, HealthModule, LoggerModule, MongoLogSinkModule, mongoDbSchema, internalRpcSchema } from '@app/common';
import path from 'path';
import { BinanceModule } from './external/binance';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        path.resolve(process.cwd(), 'apps/history_provider/.env'),
        path.resolve(process.cwd(), 'env/logger.env'),
      ],
      isGlobal: true,
      validationSchema: Joi.object({
        ...mongoDbSchema,
        ...internalRpcSchema,
        HISTORY_TCP_HOST: Joi.string().required(),
        HISTORY_TCP_PORT: Joi.number().required(),
        BINANCE_BASE_URL: Joi.string().optional().default('https://api.binance.com'),
        BINANCE_KLINES_ENDPOINT: Joi.string().optional().default('/api/v3/klines'),
      }),
    }),
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    InternalRpcGuardModule,
    DatabaseMongooseModule,
    BinanceModule,
  ],
  controllers: [HistoryProviderController],
  providers: [HistoryProviderService, GlobalRpcExceptionFilter],
})
export class HistoryProviderModule {}
