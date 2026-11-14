import { Module } from '@nestjs/common';
import path from 'path';
import { PriceCalculatorController } from './price_calculator.controller';
import { PriceCalculatorService } from './price_calculator.service';
import { HealthModule, LoggerModule, redisSchema, kafkaSchema, mongoDbSchema, internalRpcSchema } from '@app/core';
import { CALCULATOR_SERVICE, KafkaClientModule } from '@app/messaging';
import { RedisModule } from '@app/redis';
import { DatabaseMongooseModule, MongoLogSinkModule, CandleStorageService } from '@app/mongo';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { PriceCalculatorRepository } from './price_calculator.repository';
import { CalculatorRegistryService } from './services/calculator/calculator-registry.service';
import { ProviderRegistryService } from './services/provider-registry.service';
import { SelfCalculatorInstanceService } from './services/calculator/self-calculator-instance.service';
import { RebalanceService } from './services/calculator/rebalance.service';
import { ClusterChangeDetectorService } from './services/cluster-change-detector.service';
import { CalculatorIdentityService } from './services/calculator/calculator-identity.service';
import { SubscriptionService } from './services/subscription.service';
import { CandleProcessedService, CandleAggregatorService } from './services/candle';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), 'apps/price_calculator/.env'),
        path.resolve(process.cwd(), 'env/logger.env'),
      ],
      validationSchema: Joi.object({
        ...redisSchema,
        REDIS_PASSWORD: Joi.string().required(),
        ...kafkaSchema,
        KAFKA_CONSUMER_GROUP: Joi.string().optional().default('calculator-consumer'),
        ...mongoDbSchema,
        ...internalRpcSchema,
        INSTANCE_ID: Joi.optional().default('marko-calculator-1'),
        CALCULATOR_TCP_HOST: Joi.string().optional().default('0.0.0.0'),
        CALCULATOR_TCP_PORT: Joi.number().optional().default(30012),
      }),
    }),
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    DatabaseMongooseModule,
    RedisModule,
    KafkaClientModule.register({ name: CALCULATOR_SERVICE }),
  ],

  controllers: [PriceCalculatorController],
  providers: [
    PriceCalculatorService,
    PriceCalculatorRepository,
    CalculatorIdentityService,
    CandleStorageService,
    SelfCalculatorInstanceService,
    ProviderRegistryService,
    ClusterChangeDetectorService,
    CalculatorRegistryService,
    RebalanceService,
    SubscriptionService,
    CandleAggregatorService,
    CandleProcessedService,
  ],
})
export class PriceCalculatorModule {}
