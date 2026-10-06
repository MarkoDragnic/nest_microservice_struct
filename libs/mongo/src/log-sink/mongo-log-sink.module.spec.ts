import { ConsoleLogger, Injectable, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { LOG_SINK, LoggerModule, LoggerService } from '@app/core/logger';
import { LogDocument } from './log.schema';
import { MongoLogSinkModule } from './mongo-log-sink.module';

@Injectable()
class Consumer {
  constructor(readonly logger: LoggerService) {
    this.logger.setContext(Consumer.name);
  }
}

@Module({ providers: [Consumer] })
class ConsumerModule {}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('MongoLogSinkModule', () => {
  const originalUri = process.env.MONGODB_LOGGER_URI;

  beforeEach(() => {
    jest.spyOn(ConsoleLogger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUri === undefined) {
      delete process.env.MONGODB_LOGGER_URI;
    } else {
      process.env.MONGODB_LOGGER_URI = originalUri;
    }
  });

  // Same import order as the app root modules: the sink module right before LoggerModule.
  const appImports = () => [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    ConsumerModule,
  ];

  it('gives LoggerService the Mongo sink when MONGODB_LOGGER_URI is set', async () => {
    process.env.MONGODB_LOGGER_URI = 'mongodb://localhost:27017/logs-test';
    const logModel = { create: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({ imports: appImports() })
      // No real Mongo in unit tests: replace the connection and the model, keep the module wiring.
      .overrideProvider(getConnectionToken('logger-db'))
      .useValue({ close: jest.fn() })
      .overrideProvider(getModelToken(LogDocument.name, 'logger-db'))
      .useValue(logModel)
      .compile();

    moduleRef.get(Consumer).logger.log('order placed', { orderId: '42' });
    await flushPromises();

    expect(logModel.create).toHaveBeenCalledTimes(1);
    expect(logModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'INFO',
        service: 'Consumer',
        message: 'order placed',
        metadata: { orderId: '42' },
      }),
    );

    await moduleRef.close();
  });

  it('provides no sink and no logger-db connection when MONGODB_LOGGER_URI is not set', async () => {
    delete process.env.MONGODB_LOGGER_URI;

    const moduleRef = await Test.createTestingModule({ imports: appImports() }).compile();

    expect(() => moduleRef.get(LOG_SINK, { strict: false })).toThrow();
    expect(() => moduleRef.get(getConnectionToken('logger-db'), { strict: false })).toThrow();

    await moduleRef.close();
  });

  it('fails at startup when MONGODB_LOGGER_URI is loaded only after MongoLogSinkModule.forRoot() ran', async () => {
    delete process.env.MONGODB_LOGGER_URI;

    // Wrong order: the sink is evaluated first, and only then does the app config make the URI available.
    const sinkModule = MongoLogSinkModule.forRoot();
    process.env.MONGODB_LOGGER_URI = 'mongodb://localhost:27017/logs-test';
    const imports = [
      sinkModule,
      LoggerModule.forRoot(),
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      ConsumerModule,
    ];

    await expect(Test.createTestingModule({ imports }).compile()).rejects.toThrow(/MONGODB_LOGGER_URI/);
  });
});
