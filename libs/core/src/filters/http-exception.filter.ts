import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Optional } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';
import { ResponseMessage } from '@app/contracts/types';
import { LoggerService } from '../logger';

@Injectable()
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  constructor(@Optional() private readonly logger?: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

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
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        message = (body as Record<string, any>).message ?? exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (this.logger) {
      const text = Array.isArray(message) ? message.join(', ') : message;
      const meta = { statusCode, stack: (exception as Error)?.stack };
      if (statusCode >= 500) {
        this.logger.error(text, meta);
      } else {
        this.logger.warn(text, meta);
      }
    }

    response.status(statusCode).json({
      error: true,
      statusCode,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
}
