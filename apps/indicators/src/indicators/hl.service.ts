import { HL } from '../libs/HL';
import { IIndicators } from '../interfaces/indicators.interface';
import { IndicatorsResponse, IndicatorState } from '../types/indicators.types';
import { Inject, Injectable } from '@nestjs/common';
import { HISTORY_SERVICE, TCP_EVENTS } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { ClientTcpService } from '@app/common/clients/client-tcp.service';

@Injectable()
export class HLService implements IIndicators {
  private hlInstances = new Map<string, HL>();

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
    indicator.add(price);

    if (!indicator.isStable()) {
      return {
        symbol,
        status: IndicatorState.LOADING,
        period,
        data: { error: `Need ${period} data points` },
      };
    }

    return {
      symbol,
      status: IndicatorState.STABLE,
      period,
      data: {
        value: {
          high: Number(indicator.getHigh()) || 0,
          low: Number(indicator.getLow()) || 0,
        },
      },
    };
  }

  private async getInstance(symbol: string, period: number, timestamp: number, interval: string): Promise<HL> {
    const instanceKey = `${symbol}_${period}_${interval}`;
    const existing = this.hlInstances.get(instanceKey);
    if (existing) return existing;

    const hl = new HL(period);

    const prices = await this.tcpClientService.send<number[]>(this.historyClient, TCP_EVENTS.HISTORY_MINUTE_DATA, {
      symbol,
      period,
      timestamp,
      interval,
    });

    if (prices.length != period || !Array.isArray(prices)) {
      return hl;
    }

    for (const p of prices) {
      if (Number.isFinite(p)) {
        hl.add(p);
      }
    }

    this.hlInstances.set(instanceKey, hl);
    return hl;
  }
}
