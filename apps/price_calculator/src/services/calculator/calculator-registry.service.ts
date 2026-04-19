import { Injectable } from '@nestjs/common';
import { RedisCalculatorProviderKeysService } from '@app/common';
import { PriceCalculatorRepository } from '../../price_calculator.repository';
import { CalculatorIdentityService } from './calculator-identity.service';
import { IInstance, IUpdateInstancePayload } from '../../interfaces/price_calculator.interface';

@Injectable()
export class CalculatorRegistryService {
  constructor(
    private readonly priceCalculatorRegistry: PriceCalculatorRepository,
    private readonly redisCalculatorKeysService: RedisCalculatorProviderKeysService,
    private readonly identity: CalculatorIdentityService,
  ) {}

  async registerSelf(): Promise<void> {
    await this.priceCalculatorRegistry.sadd(this.redisCalculatorKeysService.activeProvidersKey, this.identity.id);
  }

  async unregisterSelf(): Promise<void> {
    await this.priceCalculatorRegistry.srem(this.redisCalculatorKeysService.activeProvidersKey, this.identity.id);
  }

  async getActiveCalculators(): Promise<Record<string, IInstance>> {
    const activeCalculators = await this.priceCalculatorRegistry.smembers(
      this.redisCalculatorKeysService.activeProvidersKey,
    );

    const calculatorsMap: Record<string, IInstance> = {};
    await Promise.all(
      activeCalculators.map(async (calculatorId) => {
        const info = (await this.priceCalculatorRegistry.hgetall(
          this.redisCalculatorKeysService.instanceKey(calculatorId),
        )) as IInstance;

        if (Object.keys(info).length > 0) {
          calculatorsMap[calculatorId] = info;
          return;
        }

        await this.priceCalculatorRegistry.srem(this.redisCalculatorKeysService.activeProvidersKey, calculatorId);
      }),
    );

    return calculatorsMap;
  }

  async updateInstance(calculatorId: string, patch: IUpdateInstancePayload): Promise<void> {
    await this.priceCalculatorRegistry.hset(this.redisCalculatorKeysService.instanceKey(calculatorId), {
      ...patch,
      recalculate: '1',
    });
  }
}
