import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, map, Observable, tap } from 'rxjs';
import { TCP_EVENTS } from '@app/contracts';
import { LoggerService } from '@app/core';
import { AUTH_SERVICE } from '@app/messaging';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly internalRpcToken: string;

  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(JwtAuthGuard.name);
    this.internalRpcToken = this.configService.getOrThrow<string>('INTERNAL_RPC_TOKEN');
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwt = request?.cookies?.Authentication;

    if (!jwt) {
      throw new UnauthorizedException();
    }

    return this.authClient.send(TCP_EVENTS.AUTHENTICATE, {
      payload: { Authentication: jwt },
      serviceToken: this.internalRpcToken,
    }).pipe(
      tap((res) => {
        if (res?.error) {
          throw new UnauthorizedException(typeof res?.message === 'string' ? res.message : 'Authentication failed');
        }
        context.switchToHttp().getRequest().user = res;
      }),
      map(() => true),
      catchError((err) => {
        this.logger.warn('JWT auth failed', { error: err?.message, stack: err?.stack });
        throw new UnauthorizedException();
      }),
    );
  }
}
