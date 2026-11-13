import { ConsoleLogger, Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { ILogEntry } from './interfaces/logger.interface';
import { LOG_SINK, type LogSink } from './interfaces/log-sink.interface';
import { LogSeverity } from './types/logger.types';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  // Depth counts keys and array indexes below the metadata object: its own values are at depth 1.
  private static readonly MAX_SANITIZE_DEPTH = 10;
  private serviceName: string = 'Unknown';

  constructor(@Optional() @Inject(LOG_SINK) private readonly sink: LogSink | null) {
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

  private static readonly SENSITIVE_KEYS = new Set(
    [
      'password',
      'apiKey',
      'apiSecret',
      'token',
      'secret',
      'authorization',
      'cookie',
      'jwt',
      'refreshToken',
      'accessToken',
      'xApiKey',
      'setCookie',
      'passphrase',
      'privateKey',
      'clientSecret',
      'passwordHash',
    ].map((key) => LoggerService.normalizeKey(key)),
  );

  private static normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // visited holds only the objects on the current path, so a shared reference is not taken for a cycle.
  private sanitizeMetadata(
    metadata: Record<string, any>,
    visited = new WeakSet<object>(),
    depth = 0,
  ): Record<string, any> {
    visited.add(metadata);
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (LoggerService.SENSITIVE_KEYS.has(LoggerService.normalizeKey(key))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = this.sanitizeValue(value, visited, depth + 1);
      }
    }
    visited.delete(metadata);
    return result;
  }

  private sanitizeValue(value: unknown, visited: WeakSet<object>, depth: number): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (depth > LoggerService.MAX_SANITIZE_DEPTH) {
      return '[MaxDepth]';
    }
    if (visited.has(value)) {
      return '[Circular]';
    }
    if (Array.isArray(value)) {
      visited.add(value);
      const result = value.map((item) => this.sanitizeValue(item, visited, depth + 1));
      visited.delete(value);
      return result;
    }
    return this.sanitizeMetadata(value as Record<string, any>, visited, depth);
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
    if (!this.sink) return;
    try {
      await this.sink.write(logEntry);
    } catch (error) {
      super.error('[Logger] Database write error', error?.message ?? '');
    }
  }

  private consoleLog(severity: LogSeverity, message: string, service: string, metadata?: Record<string, any>) {
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
