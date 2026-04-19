import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ICandle,
  CandleStorageService,
  IHLValue,
  Indicators,
  IndicatorsRedisRepository,
  IndicatorsValues,
  IKafkaEvent,
} from '@app/common';
import { IIndicatorTriggerEventV1, KAFKA_TOPICS } from '@app/common/kafka';
import { TRADER_SERVICE } from '@app/common/clients/services';
import { ClientProxy } from '@nestjs/microservices';
import { RsiService } from './indicators/rsi.service';
import { HLService } from './indicators/hl.service';
import { IndicatorsResponse, IndicatorState } from './types/indicators.types';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class IndicatorsService {
  private readonly logger = new Logger(IndicatorsService.name);

  constructor(
    private rsiService: RsiService,
    private hlService: HLService,
    private readonly candleStorage: CandleStorageService,
    private readonly indicatorsRedisRepository: IndicatorsRedisRepository,
    @Inject(TRADER_SERVICE) private readonly traderClient: ClientProxy,
  ) {}

  async calculateIndicators(candle: ICandle): Promise<void> {
    const activeIndicators = await this.indicatorsRedisRepository.getIndicatorsUse(candle.symbol);

    if (!Object.keys(activeIndicators).length) return;

    const indicators: Indicators = {};

    for (const [indicatorName, periods] of Object.entries(activeIndicators)) {
      let response: IndicatorsResponse;
      for (const period of periods) {
        switch (indicatorName) {
          case IndicatorsValues.RSI:
            response = await this.rsiService.update(
              candle.symbol,
              period,
              candle.close,
              candle.openTime,
              candle.interval,
            );
            if (response.status == IndicatorState.STABLE) {
              (indicators.rsi ??= {})[period] = response.data.value?.rsi;
            }
            break;
          case IndicatorsValues.HL:
            response = await this.hlService.update(
              candle.symbol,
              period,
              candle.close,
              candle.openTime,
              candle.interval,
            );
            if (response.status == IndicatorState.STABLE) {
              (indicators.hl ??= {})[period] = response.data.value as IHLValue;
            }
            break;
          default:
            // ignore unknown indicators for now
            break;
        }
      }
    }
    if (Object.keys(indicators).length > 0) {
      const candleWithIndicators = { ...candle, indicators };

      await this.candleStorage.upsert(candleWithIndicators, candle.interval);

      const event: IIndicatorTriggerEventV1 = {
        schemaVersion: 1,
        eventType: KAFKA_TOPICS.INDICATOR_TRIGGER,
        eventId: `${candle.provider}:${candle.symbol}:${candle.interval}:${candle.closeTime}`,
        producedAt: new Date().toISOString(),
        candle: candleWithIndicators,
      };

      this.traderClient
        .emit(KAFKA_TOPICS.INDICATOR_TRIGGER, {
          key: candle.symbol,
          value: event,
          headers: {},
        } as IKafkaEvent)
        .subscribe({ error: (err) => this.logger.error('Failed to emit indicator trigger', err?.message) });
    }
  }
}
