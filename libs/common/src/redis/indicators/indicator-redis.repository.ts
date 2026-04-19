import { Injectable } from '@nestjs/common';
import {
  RedisAbstractRepository,
  RedisIndicatorsProviderKeysService,
  RedisService,
} from '@app/common/redis';
import { LoggerService } from '@app/common/logger';

@Injectable()
export class IndicatorsRedisRepository extends RedisAbstractRepository {
  constructor(
    redisService: RedisService,
    private readonly keys: RedisIndicatorsProviderKeysService,
    protected readonly logger: LoggerService,
  ) {
    super(redisService);
    this.logger.setContext(IndicatorsRedisRepository.name);
  }

  async getIndicatorsUse(symbol: string) {
    const key = this.keys.symbolKey(symbol);
    const members = await this.zrangebyscore(key, 1, '+inf');
    const out = new Map<string, Set<number>>();
    for (const member of members) {
      const [indicator, periodStr] = member.split(':');
      const period = Number(periodStr);

      if (!indicator || !Number.isFinite(period)) continue;

      const set = out.get(indicator) ?? new Set<number>();
      set.add(period);
      out.set(indicator, set);
    }
    return Object.fromEntries(
      [...out.entries()].map(([indicator, set]) => [
        indicator,
        [...set].sort((a, b) => a - b),
      ]),
    );
  }

  async updateIndicatorsUse(symbol: string, diff: DiffType) {
    const key = this.keys.symbolKey(symbol);
    for (const { indicator, period } of diff.remove ?? []) {
      const scoreStr = await this.zincrby(
        key,
        -1,
        this.member(indicator, period),
      );
      const score = Number(scoreStr);

      if (!Number.isFinite(score) || score <= 0) {
        await this.zrem(key, this.member(indicator, period));
      }
    }

    for (const { indicator, period } of diff.add ?? []) {
      await this.zincrby(key, 1, this.member(indicator, period));
    }
  }

  private member(indicator: string, period: number) {
    return `${indicator}:${period}`;
  }
}

type DiffType = {
  remove: {
    indicator: string;
    period: number;
  }[];
  add: {
    indicator: string;
    period: number;
  }[];
};
