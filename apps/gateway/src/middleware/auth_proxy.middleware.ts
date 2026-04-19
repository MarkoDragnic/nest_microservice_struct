import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import type { Request, Response } from 'express';

@Injectable()
export class AuthProxyMiddleware implements NestMiddleware {
  private readonly middleware: ReturnType<typeof createProxyMiddleware>;

  constructor(private readonly configService: ConfigService) {
    const target = `http://${this.configService.get<string>(
      'AUTH_HTTP_HOST',
    )}:${this.configService.get<number>('AUTH_HTTP_PORT')}`;

    this.middleware = createProxyMiddleware({
      target,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req: Request) => {
          fixRequestBody(proxyReq, req);
        },
        error: (_err, _req, res) => {
          (res as Response).status(502).json({ ok: false, message: 'Auth service unreachable' });
        },
      },
    });
  }

  use(req: Request, res: Response, next: (err?: any) => void) {
    return this.middleware(req, res, next);
  }
}
