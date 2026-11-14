import { LogSeverity } from '../types/logger.types';

export interface ILogEntry {
  date: string;
  severity: LogSeverity;
  service: string;
  message: string;
  metadata?: Record<string, any>;
  stack?: string;
  timestamp: Date;
}

export interface ILoggerOptions {
  service: string;
  enableConsole?: boolean;
  enableDatabase?: boolean;
}
