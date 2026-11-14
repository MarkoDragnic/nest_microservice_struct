import { UnauthorizedException } from '@nestjs/common';
import { InternalRpcGuard } from './internal-rpc.guard';

describe('InternalRpcGuard', () => {
  const createGuard = (token = 'local-cluster-rpc-token') => {
    return new InternalRpcGuard({
      get: jest.fn().mockReturnValue(token),
    } as any);
  };

  const createRpcContext = (data: Record<string, unknown>) => ({
    getType: jest.fn().mockReturnValue('rpc'),
    switchToRpc: jest.fn().mockReturnValue({
      getData: jest.fn().mockReturnValue(data),
    }),
  });

  describe('canActivate', () => {
    it('ignores non-rpc contexts', () => {
      const guard = createGuard();
      const context = {
        getType: jest.fn().mockReturnValue('http'),
      } as any;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('rejects calls without the shared token', () => {
      const guard = createGuard();
      const context = createRpcContext({ payload: { id: '123' } }) as any;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('rejects calls with the wrong token', () => {
      const guard = createGuard();
      const context = createRpcContext({
        serviceToken: 'wrong-token',
        payload: { id: '123' },
      }) as any;

      expect(() => guard.canActivate(context)).toThrow('Invalid internal RPC token');
    });

    it('unwraps object payloads after successful validation', () => {
      const guard = createGuard();
      const data = {
        serviceToken: 'local-cluster-rpc-token',
        payload: {
          id: '123',
          email: 'user@example.com',
        },
      };
      const context = createRpcContext(data) as any;

      expect(guard.canActivate(context)).toBe(true);
      expect(data).toEqual({
        id: '123',
        email: 'user@example.com',
      });
    });

    it('leaves the handler data deep-equal to the payload, with nothing from the envelope', () => {
      const guard = createGuard();
      const payload = { id: '123', email: 'user@example.com' };
      const data = {
        payload: { ...payload },
        serviceToken: 'local-cluster-rpc-token',
        correlationId: 'b0a1c2d3-0000-4000-8000-000000000001',
      };
      const context = createRpcContext(data) as any;

      expect(guard.canActivate(context)).toBe(true);
      expect(data).toEqual(payload);
      expect(Object.keys(data).sort()).toEqual(['email', 'id']);
    });

    it('keeps payload fields that are named like envelope fields', () => {
      const guard = createGuard();
      const data = {
        payload: { correlationId: 'from-the-sender', payload: 'inner' },
        serviceToken: 'local-cluster-rpc-token',
        correlationId: 'from-the-envelope',
      };
      const context = createRpcContext(data) as any;

      expect(guard.canActivate(context)).toBe(true);
      expect(data).toEqual({ correlationId: 'from-the-sender', payload: 'inner' });
    });

    it('leaves a non-object payload under payload and removes the rest of the envelope', () => {
      const guard = createGuard();
      const data = {
        payload: 'BTCUSDT',
        serviceToken: 'local-cluster-rpc-token',
        correlationId: 'b0a1c2d3-0000-4000-8000-000000000001',
      };
      const context = createRpcContext(data) as any;

      expect(guard.canActivate(context)).toBe(true);
      expect(data).toEqual({ payload: 'BTCUSDT' });
    });
  });
});
