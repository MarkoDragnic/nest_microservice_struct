import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '@app/common';
import type Redis from 'ioredis';

@Injectable()
export class RefreshTokenRepository {
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.getOrThrow<number>('JWT_REFRESH_EXPIRATION');
  }

  private key(userId: string, tokenId: string): string {
    return `refresh_token:${userId}:${tokenId}`;
  }

  async save(userId: string, tokenId: string): Promise<void> {
    await this.redis.set(this.key(userId, tokenId), '1', 'EX', this.ttlSeconds);
  }

  async exists(userId: string, tokenId: string): Promise<boolean> {
    return (await this.redis.exists(this.key(userId, tokenId))) === 1;
  }

  async delete(userId: string, tokenId: string): Promise<void> {
    await this.redis.del(this.key(userId, tokenId));
  }
}
