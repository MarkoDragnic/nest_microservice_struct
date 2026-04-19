import { Injectable } from '@nestjs/common';
import { INormalizedTick, CandleStorageService, RedisPriceProviderKeysService, RedisService } from '@app/common';
import { SelfCalculatorInstanceService } from './calculator/self-calculator-instance.service';
import { CandleAggregatorService, CandleProcessedService } from './candle';
import { LoggerService } from '@app/common/logger';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPriceKeysService: RedisPriceProviderKeysService,
    private readonly selfInstance: SelfCalculatorInstanceService,
    private readonly candleAggregator: CandleAggregatorService,
    private readonly candleStorage: CandleStorageService,
    private readonly candleProcessedService: CandleProcessedService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(SubscriptionService.name);
  }

  async subscribe(): Promise<void> {
    const { provider, symbols } = this.selfInstance.getInstance();
    if (!provider || !symbols) {
      this.logger.log('Skipping price subscription because this calculator is currently idle.');
      return;
    }

    const subKey = this.redisPriceKeysService.publishKey(provider, symbols);
    await this.redisService.subscribe(subKey, (channel: string, message: string) => {
      let tick: INormalizedTick;
      try {
        tick = JSON.parse(message);
      } catch {
        return;
      }
      if (!tick || !tick.ts || !tick.symbol || !tick.provider) return;

      const candle = this.candleAggregator.aggregate(tick);
      if (candle) {
        void this.candleProcessedService.send(candle);
        void this.candleStorage.upsert(candle, '1m');
      }
    });
    this.logger.log('Subscribing to price updates...');
  }

  async unsubscribe(): Promise<void> {
    await this.redisService.unsubscribe();
  }
}
