import { Injectable } from '@nestjs/common';
import { hasher } from 'node-object-hash';
import { IInstance } from '../interfaces/price_calculator.interface';
@Injectable()
export class ClusterChangeDetectorService {
  private providers: string[] = [];
  private calculators: Record<string, IInstance> = {};

  private sortHasher = hasher({ sort: true, alg: 'sha256' });

  isChanged(nextProviders: string[], nextCalculators: Record<string, IInstance>): boolean {
    const changed =
      this.sortHasher.hash(nextProviders) !== this.sortHasher.hash(this.providers) ||
      this.sortHasher.hash(nextCalculators) !== this.sortHasher.hash(this.calculators);

    if (changed) {
      this.providers = nextProviders;
      this.calculators = nextCalculators;
    }

    return changed;
  }

  getProviders(): string[] {
    return this.providers;
  }

  getCalculators(): Record<string, IInstance> {
    return this.calculators;
  }

  acknowledgeChangeInCalculators(updates: Record<string, IInstance>): void {
    this.calculators = updates;
  }
}
