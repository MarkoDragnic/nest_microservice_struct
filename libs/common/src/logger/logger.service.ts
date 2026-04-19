import { ConsoleLogger, Injectable, Optional, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LogDocument } from './schemas/log.schema';
import { Model } from 'mongoose';
import { ILogEntry } from './interfaces/logger.interface';
import { LogSeverity } from './types/logger.types';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  private serviceName: string = 'Unknown';

  constructor(
    @Optional() @InjectModel(LogDocument.name, 'logger-db') private readonly logModel: Model<LogDocument> | null,
  ) {
    super();
  }

  setContext(context: string) {
    this.serviceName = context;
    super.setContext(context);
  }

  log(message: string, metadata?: Record<string, any> | string, context?: string) {
    const normalized = this.normalizeMetaContext(metadata, context);
    void this.logToAll(LogSeverity.INFO, message, normalized.metadata, normalized.context);
  }

  error(message: string, metadataOrStack?: Record<string, any> | string, context?: string) {
    const normalized = this.normalizeMetaContext(metadataOrStack, context, true);
    void this.logToAll(LogSeverity.ERROR, message, normalized.metadata, normalized.context);
  }

  warn(message: string, metadata?: Record<string, any> | string, context?: string) {
    const normalized = this.normalizeMetaContext(metadata, context);
    void this.logToAll(LogSeverity.WARNING, message, normalized.metadata, normalized.context);
  }

  debug(message: string, metadata?: Record<string, any> | string, context?: string) {
    const normalized = this.normalizeMetaContext(metadata, context);
    void this.logToAll(LogSeverity.DEBUG, message, normalized.metadata, normalized.context);
  }

  notice(message: string, metadata?: Record<string, any>, context?: string) {
    void this.logToAll(LogSeverity.NOTICE, message, metadata, context);
  }

  critical(message: string, metadata?: Record<string, any>, context?: string) {
    void this.logToAll(LogSeverity.CRITICAL, message, metadata, context);
  }

  private static readonly SENSITIVE_KEYS = new Set([
    'password', 'apiKey', 'apiSecret', 'token', 'secret',
    'authorization', 'cookie', 'jwt', 'refreshToken',
  ]);

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (LoggerService.SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitizeMetadata(value as Record<string, any>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private async logToAll(severity: LogSeverity, message: string, metadata?: Record<string, any>, context?: string) {
    const service = context || this.serviceName;
    const now = new Date();
    const date = this.formatDate(now);

    this.consoleLog(severity, message, service, metadata);

    const safeMetadata = metadata ? this.sanitizeMetadata(metadata) : {};

    const logEntry: ILogEntry = {
      date,
      severity,
      service,
      message,
      metadata: safeMetadata,
      stack: safeMetadata.stack,
      timestamp: now,
    };

    this.saveToDatabase(logEntry).catch((err) => {
      super.error('[Logger] Failed to save log to database', err?.message ?? '');
    });
  }

  private async saveToDatabase(logEntry: ILogEntry): Promise<void> {
    if (!this.logModel) return;
    try {
      await this.logModel.create(logEntry);
    } catch (error) {
      super.error('[Logger] Database write error', error?.message ?? '');
    }
  }

  private consoleLog(severity: LogSeverity, message: string, service: string, metadata?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const context = service;

    switch (severity) {
      case LogSeverity.DEBUG:
        super.debug(message, context);
        break;
      case LogSeverity.INFO:
        super.log(message, context);
        break;
      case LogSeverity.NOTICE:
        super.log(`[NOTICE] ${message}`, context);
        break;
      case LogSeverity.WARNING:
        super.warn(message, context);
        break;
      case LogSeverity.ERROR:
        super.error(message, metadata?.stack || '', context);
        break;
      case LogSeverity.CRITICAL:
        super.error(`[CRITICAL] ${message}`, metadata?.stack || '', context);
        break;
      default:
        super.log(message, context);
    }

  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private normalizeMetaContext(
    metadataOrContext?: Record<string, any> | string,
    context?: string,
    treatStringAsStack = false,
  ): { metadata?: Record<string, any>; context?: string } {
    if (typeof metadataOrContext === 'string') {
      if (treatStringAsStack) {
        return { metadata: { stack: metadataOrContext }, context };
      }
      return { metadata: undefined, context: metadataOrContext };
    }
    return { metadata: metadataOrContext, context };
  }

}
