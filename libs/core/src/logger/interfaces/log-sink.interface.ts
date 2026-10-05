import { ILogEntry } from './logger.interface';

export const LOG_SINK = 'LOG_SINK';

export interface LogSink {
  write(entry: ILogEntry): Promise<void>;
}
