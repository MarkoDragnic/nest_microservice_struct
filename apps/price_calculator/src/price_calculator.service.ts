import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@app/core';

import { CalculatorRegistryService } from './services/calculator/calculator-registry.service';
import { ProviderRegistryService } from './services/provider-registry.service';
import { SelfCalculatorInstanceService } from './services/calculator/self-calculator-instance.service';
import { RebalanceService } from './services/calculator/rebalance.service';
import { ClusterChangeDetectorService } from './services/cluster-change-detector.service';
import { SubscriptionService } from './services/subscription.service';

@Injectable()
export class PriceCalculatorService implements OnModuleInit, OnModuleDestroy {
  protected readonly TTL_SECONDS = 60;
  protected readonly HEARTBEAT_MS = 30000;
  protected heartbeatTimer: NodeJS.Timeout;
  constructor(
    private readonly selfInstance: SelfCalculatorInstanceService,
    private readonly rebalanceService: RebalanceService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly changeDetector: ClusterChangeDetectorService,
    private readonly subscribeService: SubscriptionService,
    private readonly calculatorRegistry: CalculatorRegistryService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PriceCalculatorService.name);

    this.heartbeatTimer = setInterval(async () => {
      const instance = await this.selfInstance.refreshFromRedis();
      const currentProviders = await this.providerRegistry.getProviders();
      const cals = await this.calculatorRegistry.getActiveCalculators();

      if (this.changeDetector.isChanged(currentProviders, cals)) {
        await this.rebalanceService.rebalance(currentProviders, cals);
      }

      if (instance?.recalculate == '1') {
        await this.selfInstance.update({
          recalculate: '0',
        });
        cals[instance.name].recalculate = '0';
        this.changeDetector.acknowledgeChangeInCalculators(cals);
        await this.subscribeService.unsubscribe();
        this.logger.log('Recalculating subscriptions...');
        await this.subscribeService.subscribe();
      }

      await this.selfInstance.touchTtl(this.TTL_SECONDS);
    }, this.HEARTBEAT_MS).unref();
  }

  async onModuleInit() {
    const instance = this.selfInstance.getInstance();
    await this.calculatorRegistry.registerSelf();
    await this.selfInstance.touchTtl(this.TTL_SECONDS);
    await this.selfInstance.update(instance);

    const providers = await this.providerRegistry.getProviders();
    const calculators = await this.calculatorRegistry.getActiveCalculators();

    await this.rebalanceService.rebalance(providers, calculators);

    await this.selfInstance.update({ recalculate: '0' });
    calculators[instance.name].recalculate = '0';
    this.changeDetector.acknowledgeChangeInCalculators(calculators);
    this.logger.log('Initial subscription to price updates...');

    await this.subscribeService.subscribe();
  }

  async onModuleDestroy() {
    clearInterval(this.heartbeatTimer);
    await this.calculatorRegistry.unregisterSelf();
  }
}
