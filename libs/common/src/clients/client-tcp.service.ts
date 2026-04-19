import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, lastValueFrom, throwError, timeout, TimeoutError } from 'rxjs';
import { LoggerService } from '../logger';
import { ResponseMessage } from '@app/common/types';
import { correlationStorage } from '../middleware/correlation.storage';

@Injectable()
export class ClientTcpService {
  private readonly internalRpcToken: string;
  private readonly tcpTimeoutMs: number;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(ClientTcpService.name);
    this.internalRpcToken = this.configService.getOrThrow<string>('INTERNAL_RPC_TOKEN');
    this.tcpTimeoutMs = this.configService.get<number>('TCP_TIMEOUT_MS') ?? 5000;
  }

  async send<T>(client: ClientProxy, event: string, payload: any): Promise<T> {
    const store = correlationStorage.getStore();
    const correlationId = store?.correlationId;

    const response = await lastValueFrom(
      client.send(event, {
        payload,
        serviceToken: this.internalRpcToken,
        ...(correlationId && { correlationId }),
      }).pipe(
        timeout(this.tcpTimeoutMs),
        catchError((err) => {
          if (err instanceof TimeoutError) {
            this.logger.warn('TCP call timed out', { event, timeoutMs: this.tcpTimeoutMs });
            return throwError(() => new RpcException({
              statusCode: 503,
              message: `Service timeout on ${event}`,
              error: true,
              event,
            }));
          }
          return throwError(() => err);
        }),
      ),
    );

    if (response.error) {
      this.logger.warn('TCP request failed', { event, payload, message: response.message });
      throw new RpcException({
        statusCode: response?.statusCode ?? 500,
        message: response?.message ?? ResponseMessage.SOMETHING_WENT_WRONG,
        error: true,
        event,
      });
    }

    return response.data ?? response;
  }
}
