import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import {
  RedisCalculatorProviderKeysService,
  RedisIndicatorsProviderKeysService,
  RedisPriceProviderKeysService,
  RedisTraderProviderKeyService,
} from './keys';

@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    RedisCalculatorProviderKeysService,
    RedisPriceProviderKeysService,
    RedisIndicatorsProviderKeysService,
    RedisTraderProviderKeyService,
  ],
  exports: [
    RedisService,
    RedisCalculatorProviderKeysService,
    RedisPriceProviderKeysService,
    RedisIndicatorsProviderKeysService,
    RedisTraderProviderKeyService,
  ],
})
export class RedisModule {}
