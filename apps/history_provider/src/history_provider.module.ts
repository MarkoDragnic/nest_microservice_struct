import { Module } from '@nestjs/common';
import { HistoryProviderController } from './history_provider.controller';
import { HistoryProviderService } from './history_provider.service';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { DatabaseMongooseModule, GlobalRpcExceptionFilter, HealthModule, LoggerModule, mongoDbSchema, internalRpcSchema } from '@app/common';
import path from 'path';
import { BinanceModule } from './external/binance';

@Module({
  imports: [
    HealthModule.register(),
    LoggerModule.forRoot(),
    DatabaseMongooseModule,
    BinanceModule,
    ConfigModule.forRoot({
      envFilePath: [path.resolve(process.cwd(), 'apps/history_provider/.env')],
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
  ],
  controllers: [HistoryProviderController],
  providers: [HistoryProviderService, GlobalRpcExceptionFilter],
})
export class HistoryProviderModule {}
