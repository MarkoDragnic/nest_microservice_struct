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
  });
});