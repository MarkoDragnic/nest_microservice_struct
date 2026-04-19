import { Injectable } from '@nestjs/common';

@Injectable()
export class TraderBatchService {
  async processInBatches<T>(items: T[], batchSize: number, handler: (item: T) => Promise<void>): Promise<void> {
    if (items.length === 0) return;

    const size = Math.max(1, Math.floor(batchSize));
    for (let i = 0; i < items.length; i += size) {
      const batch = items.slice(i, i + size);
      const results = await Promise.allSettled(batch.map((item) => handler(item)));
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          `${failures.length} trader batch item(s) failed`,
        );
      }
    }
  }
}
