import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Optional } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, of } from 'rxjs';
import { ResponseMessage } from '@app/common/types';
import { LoggerService } from '../logger';

@Injectable()
@Catch()
export class GlobalRpcExceptionFilter implements ExceptionFilter {
  constructor(@Optional() private readonly logger?: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): Observable<any> {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = ResponseMessage.SOMETHING_WENT_WRONG;

    if (exception instanceof RpcException) {
      const rpcError = exception.getError();
      if (typeof rpcError === 'string') {
        message = rpcError;
      } else if (typeof rpcError === 'object' && rpcError !== null) {
        const payload = rpcError as Record<string, any>;
        statusCode = payload.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
        message = payload.message ?? message;
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        message = (response as Record<string, any>).message ?? exception.message;
      }
      this.logException(exception, statusCode, message);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logException(exception, statusCode, message);
    }

    return of({
      error: true,
      statusCode,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  private logException(exception: Error, statusCode: number, message: string | string[]): void {
    if (!this.logger) return;
    const text = Array.isArray(message) ? message.join(', ') : message;
    const meta = { statusCode, stack: exception.stack };
    if (statusCode >= 500) {
      this.logger.error(text, meta);
    } else {
      this.logger.warn(text, meta);
    }
  }
}
