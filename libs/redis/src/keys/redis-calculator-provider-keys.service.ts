import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisCalculatorProviderKeysService {
  readonly REDIS_PREFIX = {
    redis_prefix: 'calculator_provider',
    instances: 'instances',
    providers: 'providers',
    active_providers: 'active_providers',
  };

  getKeyName(...args: string[]) {
    return this.REDIS_PREFIX.redis_prefix + ':' + args.join(':');
  }
  instanceKey = (id: string) => this.getKeyName(this.REDIS_PREFIX.instances, id);

  providersKey = (id: string) => this.getKeyName(this.REDIS_PREFIX.providers, id);

  activeProvidersKey = this.getKeyName(this.REDIS_PREFIX.active_providers);
}
