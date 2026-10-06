import { Inject, Injectable } from '@nestjs/common';
import { ICandle, KAFKA_TOPICS } from '@app/contracts';
import { LoggerService } from '@app/core';
import { CALCULATOR_SERVICE } from '@app/messaging';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class CandleProcessedService {
  constructor(
    @Inject(CALCULATOR_SERVICE)
    private readonly candleProcessedClient: ClientProxy,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CandleProcessedService.name);
  }

  async send(candle: ICandle): Promise<void> {
    this.candleProcessedClient
      .emit(KAFKA_TOPICS.CANDLE_PRICE, {
        key: candle.symbol,
        value: candle,
        headers: {},
      })
      .subscribe({
        error: (error) =>
          this.logger.error('Failed to emit candle price', {
            symbol: candle.symbol,
            error: error?.message,
            stack: error?.stack,
          }),
      });
  }
}
