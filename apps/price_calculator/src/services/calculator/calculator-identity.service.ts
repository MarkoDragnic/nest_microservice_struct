import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisCalculatorProviderKeysService } from '@app/redis';

@Injectable()
export class CalculatorIdentityService {
  readonly id: string;
  readonly key: string;

  constructor(configService: ConfigService, redisCalculatorKeysService: RedisCalculatorProviderKeysService) {
    this.id = configService.get<string>('INSTANCE_ID') as string;
    this.key = redisCalculatorKeysService.instanceKey(this.id);
  }
}
