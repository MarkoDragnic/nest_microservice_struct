import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisIndicatorsProviderKeysService {
  readonly REDIS_PREFIX = {
    redis_prefix: 'indicators_provider',
    symbols: 'symbols',
  };

  getKeyName(...args: string[]) {
    return this.REDIS_PREFIX.redis_prefix + ':' + args.join(':');
  }

  symbolKey = (symbol: string) =>
    this.getKeyName(this.REDIS_PREFIX.symbols, symbol);
}
