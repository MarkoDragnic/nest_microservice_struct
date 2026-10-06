import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisPriceProviderKeysService {
  readonly REDIS_PREFIX = {
    redis_prefix: 'price_provider',
    instances: 'instances',
    providers: 'providers',
    active_providers: 'active_providers',
    pub: 'publish',
  };

  getKeyName(...args: string[]) {
    return this.REDIS_PREFIX.redis_prefix + ':' + args.join(':');
  }
  instanceKey = (id: string) =>
    this.getKeyName(this.REDIS_PREFIX.instances, id);

  providersPriceKey = (id: string) =>
    this.getKeyName(this.REDIS_PREFIX.providers, id);

  activeProvidersKey = this.getKeyName(this.REDIS_PREFIX.active_providers);

  // symbol : *  provider : *
  // symbol : BTCUSDT  provider : binance
  // symbol : *  provider : binance

  publishKey = (provider: string, symbol: string) => {
    if (provider === '*') {
      return this.getKeyName(this.REDIS_PREFIX.providers, provider);
    }
    return this.getKeyName(this.REDIS_PREFIX.pub, provider, symbol);
  };
}
