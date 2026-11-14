import { RpcException } from '@nestjs/microservices';

export const isNotFound = (error: unknown): boolean =>
  error instanceof RpcException && (error.getError() as { statusCode?: number })?.statusCode === 404;
