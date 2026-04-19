import { Module } from '@nestjs/common';
import { TraderController } from './trader.controller';
import { TraderService } from './trader.service';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import Joi from 'joi';
import {
  ClientTcpProviderService,
  GlobalRpcExceptionFilter,
  HealthModule,
  POSITION_SERVICE,
  RedisModule,
  LoggerModule,
  ACCOUNTS_SERVICE,
  PG_READ_SERVICE,
  KafkaDlqModule,
  redisSchema,
  kafkaSchema,
  internalRpcSchema,
} from '@app/common';
import { TraderCloseRulesService } from './rules/trader-close-rules.service';
import { TraderOpenRulesService } from './rules/trader-open-rules.service';
import { IndicatorsModule } from './indicators';
import { TraderBatchService } from './libs/trader-batch.service';
import { TraderQuantityService } from './libs/trader-quantity.service';
import { TraderSymbolClaimService } from './libs/trader-symbol-claim.service';
import { TraderTickerFreshnessService } from './libs/trader-ticker-freshness.service';
import { TraderExecutionService } from './libs/trader-execution.service';
import { TraderPositionService } from './libs/trader-position.service';
import { TraderBinanceService } from './binance/trader-binance.service';

@Module({
  imports: [
    HealthModule.register(),
    LoggerModule.forRoot(),
    KafkaDlqModule.register(),
    ConfigModule.forRoot({
      envFilePath: [path.resolve(process.cwd(), 'apps/trader/.env')],
      isGlobal: true,
      validationSchema: Joi.object({
        ...redisSchema,
        REDIS_PASSWORD: Joi.string().required(),
        ...kafkaSchema,
        ...internalRpcSchema,
        INSTANCE_ID: Joi.string().required(),
        TICKER_MAX_AGE_MS: Joi.number().required(),
        SYMBOL_CLAIM_TTL_MS: Joi.number().required(),
        PG_READ_TCP_HOST: Joi.string().required(),
        PG_READ_TCP_PORT: Joi.number().required(),
        TRADER_TCP_HOST: Joi.string().optional().default('0.0.0.0'),
        TRADER_TCP_PORT: Joi.number().optional().default(30010),
        BINANCE_TEST_URL: Joi.string().required(),
        BINANCE_PROD_URL: Joi.string().required(),
        BINANCE_TRADE_ENDPOINT: Joi.string().required(),
      }),
    }),
    RedisModule,
    ClientTcpProviderService.register({
      name: POSITION_SERVICE,
      port: 'POSITION_CLIENT_PORT',
      host: 'POSITION_CLIENT_HOST',
    }),

    ClientTcpProviderService.register({
      name: ACCOUNTS_SERVICE,
      port: 'ACCOUNT_CLIENT_PORT',
      host: 'ACCOUNT_CLIENT_HOST',
    }),
    ClientTcpProviderService.register({
      name: PG_READ_SERVICE,
      port: 'PG_READ_TCP_PORT',
      host: 'PG_READ_TCP_HOST',
    }),
    IndicatorsModule,
  ],
  controllers: [TraderController],
  providers: [
    TraderService,
    TraderCloseRulesService,
    TraderOpenRulesService,
    TraderBatchService,
    TraderQuantityService,
    TraderSymbolClaimService,
    TraderTickerFreshnessService,
    TraderExecutionService,
    TraderPositionService,
    TraderBinanceService,
    GlobalRpcExceptionFilter,
  ],
})
export class TraderModule {}
