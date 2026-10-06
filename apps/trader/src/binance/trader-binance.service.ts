import { Inject, Injectable } from '@nestjs/common';
import { IBinanceCredentials, IBinanceTradeSignal } from '../interfaces/binance.interface';
import { type BinanceOrderSide, type BinanceOrderType } from '../types/binance.types';
import { type IEncryptedPayload, Environment, TCP_EVENTS } from '@app/contracts';
import { ACCOUNTS_SERVICE, ClientTcpService } from '@app/messaging';
import type { AccountCredentials } from '@app/contracts/internal';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import axios, { AxiosError } from 'axios';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class TraderBinanceService {
  private timeOffsetMs = 0;
  private readonly binanceTestUrl: string;
  private readonly binanceProdUrl: string;
  private readonly binanceTradeEndpoint: string;

  constructor(
    @Inject(ACCOUNTS_SERVICE) private readonly accountClient: ClientProxy,
    private readonly configService: ConfigService,
    private readonly tcpClientService: ClientTcpService,
  ) {
    this.binanceTestUrl = this.configService.getOrThrow<string>('BINANCE_TEST_URL');
    this.binanceProdUrl = this.configService.getOrThrow<string>('BINANCE_PROD_URL');
    this.binanceTradeEndpoint = this.configService.getOrThrow<string>('BINANCE_TRADE_ENDPOINT');
  }

  async sendSignal(credentials: IBinanceCredentials, signal: IBinanceTradeSignal) {
    if (this.timeOffsetMs === 0) {
      await this.syncServerTime(credentials.baseUrl);
    }
    const timestamp = this.getTimestamp();
    const params: Record<string, string> = { ...signal, timestamp: timestamp.toString() };
    const queryString = new URLSearchParams(params).toString();
    const signature = createHmac('sha256', credentials.apiSecret).update(queryString).digest('hex');
    const url = `${credentials.baseUrl}${credentials.endpoint}?${queryString}&signature=${signature}`;
    try {
      const res = await axios.post(url, null, {
        headers: {
          'X-MBX-APIKEY': credentials.apiKey,
        },
        timeout: 5_000,
      });

      return res.data;
    } catch (err) {
      const error = err as AxiosError<any>;
      throw new Error(
        `Binance order failed: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`,
      );
    }
  }

  async getCredentials(account: AccountCredentials): Promise<IBinanceCredentials> {
    if (!account || !account.apiKeyEncrypted || !account.apiSecretEncrypted) {
      throw new Error('Invalid account credentials');
    }

    const baseUrl =
      account.environment == Environment.SANDBOX
        ? this.binanceTestUrl
        : this.binanceProdUrl;

    return {
      apiKey: await this.decrypt(account.apiKeyEncrypted),
      apiSecret: await this.decrypt(account.apiSecretEncrypted),
      baseUrl: baseUrl,
      endpoint: this.binanceTradeEndpoint,
    };
  }

  async getSignal(
    symbol: string,
    side: BinanceOrderSide,
    type: BinanceOrderType,
    quantity: number,
  ): Promise<IBinanceTradeSignal> {
    return {
      symbol: symbol.toUpperCase(),
      side: side,
      type: type,
      quantity: quantity.toString(),
    };
  }

  private async syncServerTime(baseUrl: string): Promise<void> {
    const res = await axios.get(`${baseUrl}/api/v3/time`, { timeout: 10_000 });
    const serverTime = res.data.serverTime as number;

    this.timeOffsetMs = serverTime - Date.now();
  }

  private getTimestamp(): number {
    return Date.now() + this.timeOffsetMs;
  }

  private async decrypt(encryptedPayload: IEncryptedPayload): Promise<string> {
    return this.tcpClientService.send<string>(this.accountClient, TCP_EVENTS.ACCOUNT_DECRYPT, encryptedPayload);
  }
}
