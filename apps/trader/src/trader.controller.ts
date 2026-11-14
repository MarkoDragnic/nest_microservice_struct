import { Controller, UseFilters } from '@nestjs/common';
import { TraderService } from './trader.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { type IIndicatorTriggerEventV1, KAFKA_TOPICS } from '@app/contracts';
import { GlobalRpcExceptionFilter, LoggerService } from '@app/core';
import { KafkaDlqService } from '@app/messaging';
import { TraderSymbolClaimService } from './libs/trader-symbol-claim.service';
import { TraderTickerFreshnessService } from './libs/trader-ticker-freshness.service';

@UseFilters(GlobalRpcExceptionFilter)
@Controller()
export class TraderController {
  constructor(
    private readonly traderService: TraderService,
    private readonly symbolClaimService: TraderSymbolClaimService,
    private readonly freshnessService: TraderTickerFreshnessService,
    private readonly logger: LoggerService,
    private readonly dlq: KafkaDlqService,
  ) {
    this.logger.setContext(TraderController.name);
  }

  @MessagePattern(KAFKA_TOPICS.INDICATOR_TRIGGER, Transport.KAFKA)
  async trade(@Payload() ticker: IIndicatorTriggerEventV1): Promise<void> {
    try {
      if (!this.freshnessService.isRecent(ticker)) return;

      const shouldProcess = await this.symbolClaimService.shouldProcess(ticker);
      if (!shouldProcess) return;

      await this.traderService.handleIndicatorTrigger(ticker);
    } catch (error) {
      this.logger.error('Failed to handle indicator trigger', {
        error: error?.message,
        stack: error?.stack,
        symbol: ticker?.candle?.symbol,
      });
      this.dlq.publish(KAFKA_TOPICS.INDICATOR_TRIGGER, ticker, error);
    }
  }
}
