import { LoggerService } from '@app/core/logger';
import type Redis from 'ioredis';
import { RedisService } from './redis.service';

export abstract class RedisAbstractRepository {
  protected abstract readonly logger: LoggerService;

  protected constructor(protected readonly redisService: RedisService) {}

  protected client(): Redis {
    return this.redisService.getClient();
  }

  async get(key: string): Promise<string | null> {
    return this.client().get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client().set(key, value, 'EX', ttlSeconds);
    }
    return this.client().set(key, value);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client().del(...keys);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client().expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client().ttl(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client().hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client().hgetall(key);
  }

  async hset(key: string, values): Promise<number> {
    return this.client().hset(key, values);
  }

  async hsetMap(key: string, map: Record<string, string>): Promise<number> {
    return this.client().hset(key, map);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    if (fields.length === 0) return 0;
    return this.client().hdel(key, ...fields);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return this.client().sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client().smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return this.client().srem(key, ...members);
  }

  async zincrby(key: string, increment: number, member: string): Promise<string> {
    return this.client().zincrby(key, increment, member);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return this.client().zrem(key, ...members);
  }

  async zcard(key: string): Promise<number> {
    return this.client().zcard(key);
  }

  async zrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<string[]> {
    return this.client().zrangebyscore(key, min, max);
  }

  async setJson<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw == null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.error('Failed to JSON.parse key', {
        key,
        error: error?.message,
        stack: error?.stack,
      });
      throw error;
    }
  }
}
