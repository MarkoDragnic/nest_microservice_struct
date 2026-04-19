import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceCalculatorRepository } from '../../price_calculator.repository';
import { CalculatorIdentityService } from './calculator-identity.service';
import { IInstance } from '../../interfaces/price_calculator.interface';

@Injectable()
export class SelfCalculatorInstanceService {
  private instance: IInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly priceCalculatorRegistry: PriceCalculatorRepository,
    private readonly identity: CalculatorIdentityService,
  ) {
    this.instance = {
      name: this.identity.id,
      port: this.configService.get<string>('TCP_PORT')!,
      provider: '',
      symbols: '',
      recalculate: '1',
    };
  }

  getId(): string {
    return this.identity.id;
  }

  getKey(): string {
    return this.identity.key;
  }

  getInstance(): IInstance {
    return this.instance;
  }

  async refreshFromRedis(): Promise<IInstance> {
    this.instance = (await this.priceCalculatorRegistry.hgetall(this.identity.key)) as IInstance;
    return this.instance;
  }

  async update(patch: Partial<IInstance>): Promise<void> {
    this.instance = {
      ...this.instance,
      ...patch,
    } as IInstance;

    await this.priceCalculatorRegistry.hsetMap(this.identity.key, this.instance);
  }

  async touchTtl(ttlSeconds: number): Promise<void> {
    await this.priceCalculatorRegistry.expire(this.identity.key, ttlSeconds);
  }
}
