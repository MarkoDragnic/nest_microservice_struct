import { Inject, Injectable, Optional, type NestMiddleware } from '@nestjs/common';
import rateLimit, { type Options as RateLimitOptions } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import type { Request, Response, NextFunction } from 'express';
import { REDIS_CLIENT } from '@app/common';

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly limiter: ReturnType<typeof rateLimit>;

  constructor(@Optional() @Inject(REDIS_CLIENT) redisClient: Redis | undefined) {
    const options: Partial<RateLimitOptions> = {
      windowMs: 60_000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Too many requests, slow down.' },
    };

    if (redisClient) {
      options.store = new RedisStore({
        sendCommand: (...args: string[]) =>
          redisClient.call(args[0] as string, ...args.slice(1)) as any,
      });
    }

    this.limiter = rateLimit(options);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    this.limiter(req, res, next);
  }
}
