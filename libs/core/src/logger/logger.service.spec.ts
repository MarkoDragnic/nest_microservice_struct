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

  describe('metadata redaction', () => {
    const metadataSentToSink = async (metadata: Record<string, unknown>) => {
      const sink = { write: jest.fn().mockResolvedValue(undefined) };
      const { logger } = await createConsumer(sink);

      logger.log('redaction', metadata);
      await flushPromises();

      expect(sink.write).toHaveBeenCalledTimes(1);
      return sink.write.mock.calls[0][0].metadata;
    };

    it.each([
      ['apiKey', { apiKey: 'key-123' }, { apiKey: '[REDACTED]' }],
      ['apiSecret', { apiSecret: 'secret-123' }, { apiSecret: '[REDACTED]' }],
      ['refreshToken', { refreshToken: 'refresh-123' }, { refreshToken: '[REDACTED]' }],
      [
        'keys in any letter case',
        { APIKEY: 'key-123', Authorization: 'Bearer abc', PASSWORD: 'hunter2' },
        { APIKEY: '[REDACTED]', Authorization: '[REDACTED]', PASSWORD: '[REDACTED]' },
      ],
      [
        'sensitive keys in nested objects',
        {
          account: {
            id: 'a1',
            apiKey: 'key-123',
            credentials: { apiSecret: 'secret-123', refreshToken: 'refresh-123' },
          },
        },
        {
          account: {
            id: 'a1',
            apiKey: '[REDACTED]',
            credentials: { apiSecret: '[REDACTED]', refreshToken: '[REDACTED]' },
          },
        },
      ],
      [
        'sensitive keys in objects inside arrays',
        {
          accounts: [
            { id: 'a1', apiKey: 'key-123' },
            { id: 'a2', apiSecret: 'secret-123', refreshToken: 'refresh-123' },
          ],
        },
        {
          accounts: [
            { id: 'a1', apiKey: '[REDACTED]' },
            { id: 'a2', apiSecret: '[REDACTED]', refreshToken: '[REDACTED]' },
          ],
        },
      ],
      [
        'sensitive keys in arrays nested inside arrays and objects',
        { batches: [[{ apiKey: 'key-123' }], { items: [{ refreshToken: 'refresh-123' }] }] },
        { batches: [[{ apiKey: '[REDACTED]' }], { items: [{ refreshToken: '[REDACTED]' }] }] },
      ],
    ])('redacts %s', async (_name, metadata, expected) => {
      expect(await metadataSentToSink(metadata)).toEqual(expected);
    });

    it('keeps non-sensitive values, including arrays of primitives', async () => {
      const metadata = { orderId: '42', symbols: ['BTCUSDT', 'ETHUSDT'], sizes: [1, 2.5], nested: { ok: true } };

      expect(await metadataSentToSink(metadata)).toEqual({
        orderId: '42',
        symbols: ['BTCUSDT', 'ETHUSDT'],
        sizes: [1, 2.5],
        nested: { ok: true },
      });
    });

    describe('circular references and depth', () => {
      // Builds { level1: { level2: ... { level<levels>: leaf } } } in a loop, so the test itself cannot overflow.
      const nest = (levels: number, leaf: unknown) => {
        let value = leaf;
        for (let level = levels; level >= 1; level--) {
          value = { [`level${level}`]: value };
        }
        return value as Record<string, unknown>;
      };

      it('replaces a self-reference with [Circular]', async () => {
        const order: Record<string, unknown> = { orderId: '42' };
        order.self = order;

        expect(await metadataSentToSink(order)).toEqual({ orderId: '42', self: '[Circular]' });
      });

      it('replaces the back-reference between two objects with [Circular]', async () => {
        const robot: Record<string, unknown> = { name: 'robot' };
        const account: Record<string, unknown> = { name: 'account', robot };
        robot.account = account;

        expect(await metadataSentToSink({ robot })).toEqual({
          robot: { name: 'robot', account: { name: 'account', robot: '[Circular]' } },
        });
      });

      it('replaces an array that contains itself with [Circular]', async () => {
        const items: unknown[] = ['first'];
        items.push(items);

        expect(await metadataSentToSink({ items })).toEqual({ items: ['first', '[Circular]'] });
      });

      it.each([
        ['object', { id: 'u1' }, { from: { id: 'u1' }, to: { id: 'u1' } }],
        ['array', ['BTCUSDT'], { from: ['BTCUSDT'], to: ['BTCUSDT'] }],
      ])('keeps a shared %s that is referenced twice without a cycle', async (_kind, shared, expected) => {
        expect(await metadataSentToSink({ from: shared, to: shared })).toEqual(expected);
      });

      it('keeps a value nested exactly 10 levels deep', async () => {
        expect(await metadataSentToSink(nest(10, 'leaf'))).toEqual(nest(10, 'leaf'));
      });

      it.each([12, 20000])(
        'replaces objects nested deeper than 10 levels with [MaxDepth] (%i levels)',
        async (levels) => {
          expect(await metadataSentToSink(nest(levels, 'leaf'))).toEqual(nest(11, '[MaxDepth]'));
        },
      );

      it('cuts only objects and arrays below the depth limit, primitives pass through', async () => {
        const atDepth10 = { text: 'leaf', count: 3, none: null, list: ['a'], child: { id: 'c1' } };

        expect(await metadataSentToSink(nest(10, atDepth10))).toEqual(
          nest(10, { text: 'leaf', count: 3, none: null, list: '[MaxDepth]', child: '[MaxDepth]' }),
        );
      });
    });
  });
});
