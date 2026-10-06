import { Injectable } from '@nestjs/common';
import { RedisPriceProviderKeysService } from '@app/redis';
import { PriceCalculatorRepository } from '../price_calculator.repository';

@Injectable()
export class ProviderRegistryService {
  constructor(
    private readonly priceCalculatorRegistry: PriceCalculatorRepository,
    private readonly redisPriceKeysService: RedisPriceProviderKeysService,
  ) {}

  async getProviders(): Promise<string[]> {
    return this.priceCalculatorRegistry.smembers(this.redisPriceKeysService.activeProvidersKey);
  }
}
