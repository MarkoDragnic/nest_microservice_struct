import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService, RedisPriceProviderKeysService } from '@app/common';
import { LoggerService } from '@app/common/logger';
import { AssetProvider, ProviderId, ProviderState } from '@app/common';
import { BinanceProvider } from '../websocket/binance.provider';
import { NormalizeService } from './normalize.service';

@Injectable()
export class ProviderManagerService implements OnModuleInit, OnModuleDestroy {
  private providers = new Map<ProviderId, AssetProvider>();
  private states = new Map<ProviderId, ProviderState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly redisKeys: RedisPriceProviderKeysService,
    private readonly normalizeService: NormalizeService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ProviderManagerService.name);
  }

  async onModuleInit(): Promise<void> {
    const client = this.redisService.getClient();

    // Scan provider hashes directly as source of truth.
    // The active_providers set may be stale or missing after a crash/restart.
    const pattern = this.redisKeys.providersPriceKey('*');
    const keys: string[] = await client.keys(pattern);

    for (const key of keys) {
      const hash = await client.hgetall(key);
      if (!hash || Object.keys(hash).length === 0) continue;

      // Derive providerId from the key suffix (price_provider:providers:<id>)
      const providerId = key.split(':').pop() as ProviderId;
      if (!providerId) continue;

      const symbols = new Set(hash.symbols ? hash.symbols.split(',').filter(Boolean) : []);
      if (symbols.size === 0) continue;

      const state: ProviderState = { providerId, symbols };
      this.states.set(providerId, state);

      // Ensure set membership is consistent
      await client.sadd(this.redisKeys.activeProvidersKey, providerId);

      await this.startProvider(state);
    }

    this.logger.log('Restored providers from Redis', { count: this.states.size });
  }

  async onModuleDestroy(): Promise<void> {
    for (const [id, provider] of this.providers) {
      provider.disconnect();
      this.logger.log('Disconnected provider', { providerId: id });
    }
    this.providers.clear();
    this.states.clear();
  }

  async addSymbols(providerId: ProviderId, symbols: string[]): Promise<void> {
    let state = this.states.get(providerId);

    if (!state) {
      state = { providerId, symbols: new Set() };
      this.states.set(providerId, state);
      await this.redisService.getClient().sadd(this.redisKeys.activeProvidersKey, providerId);
      await this.startProvider(state);
    }

    symbols.forEach((s) => state!.symbols.add(s));
    const provider = this.providers.get(providerId);
    if (provider) await provider.subscribe(symbols);

    await this.redisService.getClient().hset(
      this.redisKeys.providersPriceKey(providerId),
      'symbols',
      [...state.symbols].join(','),
    );
  }

  async removeSymbols(providerId: ProviderId, symbols: string[]): Promise<void> {
    const state = this.states.get(providerId);
    if (!state) return;

    symbols.forEach((s) => state.symbols.delete(s));
    const provider = this.providers.get(providerId);
    if (provider) await provider.unsubscribe(symbols);

    await this.redisService.getClient().hset(
      this.redisKeys.providersPriceKey(providerId),
      'symbols',
      [...state.symbols].join(','),
    );
  }

  private async startProvider(state: ProviderState): Promise<void> {
    const { providerId } = state;
    if (this.providers.has(providerId)) return;

    const provider = await this.createProvider(providerId);
    if (!provider) return;

    this.providers.set(providerId, provider);
    if (state.symbols.size > 0) {
      await provider.subscribe([...state.symbols]);
    }
    this.logger.log('Started provider', { providerId, symbols: state.symbols.size });
  }

  private async createProvider(providerId: ProviderId): Promise<AssetProvider | null> {
    switch (providerId) {
      case 'binance':
        return BinanceProvider.create(
          this.configService,
          this.redisService,
          this.redisKeys,
          this.normalizeService,
          this.logger,
        );
      default:
        this.logger.warn('Unknown provider, skipping', { providerId });
        return null;
    }
  }
}
