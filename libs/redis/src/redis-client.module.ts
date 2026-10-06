import { DynamicModule, FactoryProvider, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({})
export class RedisClientModule {
  static register(): DynamicModule {
    const redisClientProvider: FactoryProvider = {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis | undefined => {
        const host = configService.get<string>('REDIS_HOST');
        if (!host) return undefined;

        return new Redis({
          host,
          port: configService.get<number>('REDIS_PORT') ?? 6379,
          username: configService.get<string>('REDIS_USER') || undefined,
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        });
      },
      inject: [ConfigService],
    };

    return {
      module: RedisClientModule,
      imports: [ConfigModule],
      providers: [redisClientProvider],
      exports: [redisClientProvider],
    };
  }
}
