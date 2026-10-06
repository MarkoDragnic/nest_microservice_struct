import WebSocket from 'ws';
import { ConfigService } from '@nestjs/config';
import { AssetProvider, BinanceData, WsCallbackType } from '@app/contracts';
import { LoggerService } from '@app/core';
import { RedisService, RedisPriceProviderKeysService } from '@app/redis';
import { NormalizeService } from '../services/normalize.service';

export class BinanceProvider implements AssetProvider {
  private symbols: Set<string> = new Set();
  private readonly type = 'binance';
  private readonly url: string;
  private messageId = 1;
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private destroyed = false;
  private readonly reconnectBase: number;
  private readonly reconnectMax: number;
  private readonly jitter: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly redisKeys: RedisPriceProviderKeysService,
    private readonly normalizeService: NormalizeService,
    private readonly logger: LoggerService,
  ) {
    this.url = configService.getOrThrow<string>('BINANCE_WEBSOCKET_URL');
    this.reconnectBase = configService.get<number>('RECONNECT_BASE_MS') ?? 2000;
    this.reconnectMax = configService.get<number>('RECONNECT_MAX_MS') ?? 30000;
    this.jitter = configService.get<number>('JITTER') ?? 0.2;
    this.logger.setContext(BinanceProvider.name);
  }

  static async create(
    configService: ConfigService,
    redisService: RedisService,
    redisKeys: RedisPriceProviderKeysService,
    normalizeService: NormalizeService,
    logger: LoggerService,
  ): Promise<BinanceProvider> {
    const provider = new BinanceProvider(configService, redisService, redisKeys, normalizeService, logger);
    await provider.connect();
    return provider;
  }

  getType(): string {
    return this.type;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.destroyed = true;
    this.connected = false;
    this.ws?.close();
    this.ws = null;
  }

  async subscribe(symbols: string[], callback?: (result: WsCallbackType) => void): Promise<void> {
    const toSubscribe = this.normalizeSubscribe(symbols);
    if (toSubscribe.length === 0) return;

    await this.ensureConnected();
    if (!this.ws) throw new Error('WebSocket not initialized');

    const payload = JSON.stringify({
      method: 'SUBSCRIBE',
      params: await this.getSymbolFormat(toSubscribe),
      id: this.messageId++,
    });

    try {
      this.ws.send(payload, (err) => {
        if (callback) {
          callback(err ? { error: true, message: { symbols } } : { error: false, message: { symbols } });
        }
      });
    } catch (err) {
      this.logger.error('Failed to subscribe — WebSocket not open', { err, symbols });
      callback?.({ error: true, message: { symbols } });
      throw err;
    }
  }

  async unsubscribe(symbols: string[], callback?: (result: WsCallbackType) => void): Promise<void> {
    const toUnsubscribe = this.normalizeUnsubscribe(symbols);
    if (toUnsubscribe.length === 0) return;
    if (!this.ws) throw new Error('WebSocket not initialized');

    const payload = JSON.stringify({
      method: 'UNSUBSCRIBE',
      params: await this.getSymbolFormat(toUnsubscribe),
      id: this.messageId++,
    });

    try {
      this.ws.send(payload, (err) => {
        if (callback) {
          callback(err ? { error: true, message: { symbols } } : { error: false, message: { symbols } });
        }
      });
    } catch (err) {
      this.logger.error('Failed to unsubscribe — WebSocket not open', { err, symbols });
      callback?.({ error: true, message: { symbols } });
      throw err;
    }
  }

  private async connect(): Promise<void> {
    if (this.destroyed) return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      await this.waitForOpen(this.ws);
      this.connected = true;
      this.reconnecting = false;
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED)
    ) {
      try { this.ws.terminate(); } catch { /* ignore */ }
    }

    this.ws = new WebSocket(this.url);
    this.reconnecting = false;

    const onMessage = (data: WebSocket.RawData) => {
      let dataParsed: BinanceData;
      try {
        dataParsed = JSON.parse(data.toString()) as BinanceData;
      } catch {
        this.logger.error('BinanceProvider: failed to parse message, discarding frame');
        return;
      }
      const normalized = this.normalizeService.binanceNormalization(dataParsed);
      if (dataParsed.s) {
        this.redisService
          .getClient()
          .publish(this.redisKeys.publishKey(this.type, dataParsed.s.toLowerCase()), normalized)
          .catch((err: Error) => this.logger.error('Redis publish error', { err }));
      }
    };

    const onClose = () => {
      this.ws?.off('message', onMessage);
      this.connected = false;
      if (this.destroyed) return;
      this.reconnecting = true;
      const delay = this.backoffDelay();
      this.reconnectAttempts += 1;
      this.logger.warn('BinanceProvider: WS closed, reconnecting', { delay, attempt: this.reconnectAttempts });
      setTimeout(() => { void this.connect(); }, delay);
    };

    const onError = (error: Error) => {
      this.logger.error('BinanceProvider: WS error', { error: error.message });
      try {
        this.connected = false;
        this.ws?.close();
      } catch { /* ignore */ }
    };

    this.ws.on('message', onMessage);
    this.ws.once('close', onClose);
    this.ws.once('error', onError);

    await this.waitForOpen(this.ws);
    this.connected = true;
    this.reconnecting = false;
    this.reconnectAttempts = 0;
    if (this.symbols.size > 0) {
      await this.resubscribeAll();
    }
  }

  private async resubscribeAll(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const params = await this.getSymbolFormat([...this.symbols]);
    this.ws.send(JSON.stringify({ method: 'SUBSCRIBE', params, id: this.messageId++ }));
    this.logger.log('BinanceProvider: re-subscribed after reconnect', { count: this.symbols.size });
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.connected) return;

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      await this.waitForOpen(this.ws);
      this.connected = true;
      this.reconnecting = false;
      return;
    }

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      await this.connect();
    }
  }

  private waitForOpen(ws: WebSocket): Promise<void> {
    if (ws.readyState === WebSocket.OPEN) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const onOpen = () => { ws.off('error', onError); ws.off('close', onClose); resolve(); };
      const onError = (err: Error) => { ws.off('open', onOpen); ws.off('close', onClose); reject(err); };
      const onClose = () => { ws.off('open', onOpen); ws.off('error', onError); reject(new Error('WebSocket closed before opening')); };
      ws.once('open', onOpen);
      ws.once('error', onError);
      ws.once('close', onClose);
    });
  }

  private backoffDelay(): number {
    const exp = Math.min(this.reconnectAttempts, 10);
    const base = Math.min(this.reconnectBase * Math.pow(2, exp), this.reconnectMax);
    const jitter = base * (Math.random() * this.jitter);
    return Math.floor(base + jitter);
  }

  private normalizeSubscribe(symbols: string[]): string[] {
    return [...new Set(symbols)].filter((s) => { if (!this.symbols.has(s)) { this.symbols.add(s); return true; } return false; });
  }

  private normalizeUnsubscribe(symbols: string[]): string[] {
    return [...new Set(symbols)].filter((s) => { if (this.symbols.has(s)) { this.symbols.delete(s); return true; } return false; });
  }

  private async getSymbolFormat(symbols: string[]): Promise<string[]> {
    return symbols.map((s) => s.toLowerCase() + '@bookTicker');
  }
}
