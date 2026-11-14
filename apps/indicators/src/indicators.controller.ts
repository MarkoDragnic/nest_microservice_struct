import { Controller, UseFilters } from '@nestjs/common';

import { EventPattern, Payload, Transport } from '@nestjs/microservices';
import { IndicatorsService } from './indicators.service';
import { type ICandle, KAFKA_TOPICS } from '@app/contracts';
import { GlobalRpcExceptionFilter, LoggerService } from '@app/core';
import { KafkaDlqService } from '@app/messaging';

@UseFilters(GlobalRpcExceptionFilter)
@Controller()
export class IndicatorsController {
  constructor(
    private readonly indicatorsService: IndicatorsService,
    private readonly logger: LoggerService,
    private readonly dlq: KafkaDlqService,
  ) {
    this.logger.setContext(IndicatorsController.name);
  }

  @EventPattern(KAFKA_TOPICS.CANDLE_PRICE, Transport.KAFKA)
  async candleBarPublished(@Payload() candle: ICandle) {
    try {
      await this.indicatorsService.calculateIndicators(candle);
    } catch (error) {
      this.logger.error('Failed to calculate indicators', {
        error: error?.message,
        stack: error?.stack,
        symbol: candle?.symbol,
      });
      this.dlq.publish(KAFKA_TOPICS.CANDLE_PRICE, candle, error);
    }
  }
}
