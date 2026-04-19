import { Inject, Injectable } from '@nestjs/common';
import { ICandle } from '@app/common';
import { CALCULATOR_SERVICE } from '@app/common/clients/services';
import { KAFKA_TOPICS } from '@app/common/kafka';
import { ClientProxy } from '@nestjs/microservices';
import { LoggerService } from '@app/common/logger';

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
