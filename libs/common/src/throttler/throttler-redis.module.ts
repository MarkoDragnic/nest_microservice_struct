import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisClientModule } from '../redis/redis-client.module';

export interface ThrottlerRedisModuleOptions {
  ttl: number;
  limit: number;
}

@Module({})
export class ThrottlerRedisModule {
  static forRoot(options: ThrottlerRedisModuleOptions = { ttl: 60000, limit: 100 }): DynamicModule {
    return {
      module: ThrottlerRedisModule,
      imports: [
        RedisClientModule.register(),
        ThrottlerModule.forRootAsync({
          imports: [RedisClientModule.register()],
          inject: [REDIS_CLIENT],
          useFactory: (redisClient: Redis | undefined) => {
            const storage = redisClient
              ? new ThrottlerStorageRedisService(redisClient)
              : undefined;

            return {
              throttlers: [{ ttl: options.ttl, limit: options.limit }],
              ...(storage ? { storage } : {}),
            };
          },
        }),
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
      exports: [ThrottlerModule],
    };
  }
}
