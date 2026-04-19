import { ResponseMessage } from './response-messages.types';

type TcpSuccess<T> = {
  error: false;
  message: ResponseMessage;
  data: T;
};

export const tcpOk = <T>(data: T, message: ResponseMessage): TcpSuccess<T> => ({
  error: false,
  message,
  data,
});
