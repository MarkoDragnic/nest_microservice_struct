import { Injectable, OnApplicationShutdown, OnModuleDestroy } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@app/core/logger';

@Injectable()
export class RedisService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly publisherClient: Redis;
  private readonly subscriberClient: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(RedisService.name);
    const host = configService.get<string>('REDIS_HOST');
    const port = configService.get<number>('REDIS_PORT');
    const username = configService.get<string>('REDIS_USER');
    const password = configService.get<string>('REDIS_PASSWORD');

    const connectionOptions: RedisOptions = {
      host,
      port,
      username,
      password,
    };

    this.publisherClient = new Redis(connectionOptions);
    this.subscriberClient = new Redis({
      ...connectionOptions,
      enableReadyCheck: false,
    });

    this.publisherClient.on('error', (err) =>
      this.logger.error('Redis publisher error', { error: err?.message, stack: err?.stack }),
    );
    this.subscriberClient.on('error', (err) =>
      this.logger.error('Redis subscriber error', { error: err?.message, stack: err?.stack }),
    );
  }

  async subscribe(pattern: string, callback: (channel: string, message: string) => void) {
    try {
      await this.subscriberClient.psubscribe(pattern);

      this.subscriberClient.on('pmessage', (matchedPattern, channel, message) => {
        if (matchedPattern === pattern) {
          callback(channel, message);
        }
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to channel', {
        pattern,
        error: error?.message,
        stack: error?.stack,
      });
    }
  }

  async unsubscribe(pattern?: string) {
    try {
      if (pattern) {
        await this.subscriberClient.punsubscribe(pattern);
      } else {
        await this.subscriberClient.punsubscribe();
      }
    } catch (error) {
      this.logger.error('Failed to unsubscribe from pattern', {
        pattern: pattern ?? '[all]',
        error: error?.message,
        stack: error?.stack,
      });
    }
  }

  getClient(): Redis {
    return this.publisherClient;
  }

  async onModuleDestroy() {
    await Promise.all([this.publisherClient.quit(), this.subscriberClient.quit()]);
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`RedisService shutting down on signal: ${signal ?? 'unknown'}`);
  }
}
