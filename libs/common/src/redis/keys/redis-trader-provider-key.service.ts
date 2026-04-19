import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisTraderProviderKeyService {
  readonly REDIS_PREFIX = {
    redis_prefix: 'trader_provider',
  };

  getKeyName(...args: string[]) {
    return this.REDIS_PREFIX.redis_prefix + ':' + args.join(':');
  }

  getClaim = (provider: string, symbol: string) => this.getKeyName('claim', provider, symbol);
}
