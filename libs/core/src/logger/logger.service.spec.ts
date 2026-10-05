import { ConsoleLogger, Global, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LOG_SINK } from './interfaces/log-sink.interface';
import { LoggerModule } from './logger.module';
import { LoggerService } from './logger.service';

@Injectable()
class Consumer {
  constructor(readonly logger: LoggerService) {
    this.logger.setContext(Consumer.name);
  }
}

@Module({ providers: [Consumer] })
class ConsumerModule {}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('LoggerService', () => {
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleLog = jest.spyOn(ConsoleLogger.prototype, 'log').mockImplementation();
    consoleError = jest.spyOn(ConsoleLogger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Consumer lives in its own module, like app code, so the sink has to reach LoggerService across modules.
  const createConsumer = async (sink?: { write: jest.Mock }) => {
    @Global()
    @Module({ providers: [{ provide: LOG_SINK, useValue: sink }], exports: [LOG_SINK] })
    class SinkModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [...(sink ? [SinkModule] : []), LoggerModule.forRoot(), ConsumerModule],
    }).compile();

    return moduleRef.get(Consumer);
  };

  it('writes the sanitized entry to a sink provided by a global module', async () => {
    const sink = { write: jest.fn().mockResolvedValue(undefined) };
    const { logger } = await createConsumer(sink);

    logger.log('order placed', { orderId: '42', password: 'hunter2' });
    await flushPromises();

    expect(sink.write).toHaveBeenCalledTimes(1);
    expect(sink.write).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'INFO',
        service: 'Consumer',
        message: 'order placed',
        metadata: { orderId: '42', password: '[REDACTED]' },
      }),
    );
  });

  it('logs to the console when no sink is provided', async () => {
    const { logger } = await createConsumer();

    expect(() => logger.log('no sink')).not.toThrow();
    await flushPromises();

    expect(consoleLog).toHaveBeenCalledWith('no sink', 'Consumer');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reports a sink failure on the console instead of throwing', async () => {
    const sink = { write: jest.fn().mockRejectedValue(new Error('mongo down')) };
    const { logger } = await createConsumer(sink);

    expect(() => logger.log('still logged')).not.toThrow();
    await flushPromises();

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), 'mongo down');
  });
});
