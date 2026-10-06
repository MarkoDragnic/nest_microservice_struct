import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IIndicatorTriggerEventV1 } from '@app/contracts';
import { RedisService, RedisTraderProviderKeyService } from '@app/redis';

@Injectable()
export class TraderSymbolClaimService {
  private readonly instanceId: string;
  private readonly ttlMs: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly redisTraderKeyService: RedisTraderProviderKeyService,
  ) {
    this.instanceId = this.configService.get<string>('INSTANCE_ID') ?? '';
    this.ttlMs = Number(this.configService.get<string>('SYMBOL_CLAIM_TTL_MS') ?? 30000);
  }

  async shouldProcess(event: IIndicatorTriggerEventV1): Promise<boolean> {
    const provider = event?.candle?.provider;
    const symbol = event?.candle?.symbol;
    if (!symbol) return false;

    const key = this.redisTraderKeyService.getClaim(String(provider ?? 'unknown'), symbol);
    const redis = this.redisService.getClient();

    const currentOwner = await redis.get(key);
    if (currentOwner === this.instanceId) {
      await redis.pexpire(key, this.ttlMs);
      return true;
    }

    if (currentOwner) return false;

    const claimed = await redis.set(key, this.instanceId, 'PX', this.ttlMs, 'NX');
    return claimed === 'OK';
  }
}
