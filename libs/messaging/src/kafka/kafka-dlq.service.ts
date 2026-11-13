import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

export const KAFKA_DLQ_CLIENT = 'KAFKA_DLQ_CLIENT';

@Injectable()
export class KafkaDlqService implements OnModuleInit {
  private readonly logger = new Logger(KafkaDlqService.name);

  constructor(@Inject(KAFKA_DLQ_CLIENT) private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  publish(originalTopic: string, payload: unknown, error: unknown): void {
    const dlqTopic = `${originalTopic}.dlq`;

    this.kafkaClient
      .emit(dlqTopic, {
        key: 'dlq',
        value: {
          originalTopic,
          payload,
          error: {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          failedAt: new Date().toISOString(),
        },
      })
      .subscribe({
        error: (err) => this.logger.error(`Failed to publish to ${dlqTopic}: ${err?.message}`),
      });
  }
}
