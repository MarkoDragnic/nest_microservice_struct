import { Inject, Injectable } from '@nestjs/common';
import { RSI } from 'trading-signals';
import { IIndicators } from '../interfaces/indicators.interface';
import { IndicatorsResponse, IndicatorState } from '../types/indicators.types';
import { TCP_EVENTS } from '@app/contracts';
import { HISTORY_SERVICE, ClientTcpService } from '@app/messaging';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RsiService implements IIndicators {
  private rsiInstances = new Map<string, RSI>();

  constructor(
    @Inject(HISTORY_SERVICE) private readonly historyClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async update(
    symbol: string,
    period: number,
    price: number,
    timestamp: number,
    interval: string,
  ): Promise<IndicatorsResponse> {
    const indicator = await this.getInstance(symbol, period, timestamp, interval);

    const previous = indicator.isStable ? Number(indicator.getResult()?.toFixed(2)) || 0 : 0;

    indicator.add(price);

    if (!indicator.isStable) {
      return {
        symbol,
        status: IndicatorState.LOADING,
        period,
        data: { error: `Need ${period} data points` },
      };
    }

    const current = Number(indicator.getResult()?.toFixed(2)) || 0;

    return {
      symbol,
      status: IndicatorState.STABLE,
      period,
      data: {
        value: { rsi: { c: current, p: previous } },
      },
    };
  }

  private makeInstanceKey(symbol: string, period: number, interval: string) {
    return `${symbol}_${period}_${interval}`;
  }

  private async getInstance(symbol: string, period: number, timestamp: number, interval: string): Promise<RSI> {
    try {
      const instanceKey = this.makeInstanceKey(symbol, period, interval);
      const existing = this.rsiInstances.get(instanceKey);
      if (existing) return existing;

      const rsi = new RSI(period);
      const prices = await this.tcpClientService.send<number[]>(this.historyClient, TCP_EVENTS.HISTORY_MINUTE_DATA, {
        symbol,
        period,
        interval,
        timestamp,
      });

      if (prices.length !== period || !Array.isArray(prices)) {
        return rsi;
      }

      for (const p of prices) {
        if (Number.isFinite(p)) {
          rsi.add(p);
        }
      }

      this.rsiInstances.set(instanceKey, rsi);
      return rsi;
    } catch {
      return new RSI(period);
    }
  }
}
