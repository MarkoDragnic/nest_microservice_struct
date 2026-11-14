import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const end = httpRequestDuration.startTimer();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          end({
            method: req.method,
            route: req.route?.path ?? req.path,
            status_code: res.statusCode,
          });
        },
        error: () => {
          const res = context.switchToHttp().getResponse();
          end({
            method: req.method,
            route: req.route?.path ?? req.path,
            status_code: res.statusCode >= 400 ? res.statusCode : 500,
          });
        },
      }),
    );
  }
}
