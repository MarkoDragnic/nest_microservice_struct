import { Injectable } from '@nestjs/common';

import { CalculatorIdentityService } from './calculator-identity.service';
import { CalculatorRegistryService } from './calculator-registry.service';
import { SelfCalculatorInstanceService } from './self-calculator-instance.service';
import { IInstance } from '../../interfaces/price_calculator.interface';

@Injectable()
export class RebalanceService {
  constructor(
    private readonly identity: CalculatorIdentityService,
    private readonly calculatorRegistry: CalculatorRegistryService,
    private readonly selfInstance: SelfCalculatorInstanceService,
  ) {}

  async rebalance(providersRaw: string[], calculators: Record<string, IInstance>): Promise<void> {
    if (calculators[this.identity.id]?.recalculate === '0') {
      return;
    }

    const providersSorted = [...new Set(providersRaw)].filter(Boolean).sort();
    const calculatorIds = Object.keys(calculators).sort();
    const calculatorCount = calculatorIds.length;

    // Scenario 1: only one calculator active -> it takes everything
    if (calculatorCount === 1) {
      await this.selfInstance.update({
        provider: '*',
        symbols: '*',
        recalculate: '1',
      });
      return;
    }

    // No providers known -> do nothing (avoid duplicates)
    if (providersSorted.length === 0) {
      await this.selfInstance.update({
        provider: '',
        symbols: '',
        recalculate: '1',
      });
      return;
    }

    // Scenario 2: providers == calculators -> divide by provider only
    if (providersSorted.length === calculatorCount) {
      await Promise.all(
        calculatorIds.map(async (calculatorId, idx) => {
          const provider = providersSorted[idx] ?? '';

          if (calculatorId === this.identity.id) {
            await this.selfInstance.update({
              provider,
              symbols: '*',
              recalculate: '1',
            });
            return;
          }

          await this.calculatorRegistry.updateInstance(calculatorId, {
            provider,
            symbols: '*',
          });
        }),
      );
      return;
    }

    // Scenario 3: calculators > providers, not yet needed.
    // When the cluster scales beyond the number of providers, symbol-level
    // sharding within each provider is required.  Current deployment uses
    // a 1:1 provider-to-calculator mapping, so this branch is intentionally
    // left as a no-op.
  }
}
