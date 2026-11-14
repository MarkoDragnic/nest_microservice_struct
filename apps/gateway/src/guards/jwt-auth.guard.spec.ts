import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { lastValueFrom, Observable, of } from 'rxjs';
import { LoggerService } from '@app/core';
import { AUTH_SERVICE } from '@app/messaging';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const authClient = { send: jest.fn() };

  beforeEach(async () => {
    authClient.send.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: AUTH_SERVICE, useValue: authClient },
        { provide: LoggerService, useValue: { setContext: jest.fn(), warn: jest.fn() } },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-internal-rpc-token' } },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
  });

  // Runs the guard for a request carrying an access token cookie, with auth answering as given.
  const authenticate = async (authAnswer: unknown) => {
    authClient.send.mockReturnValue(of(authAnswer));
    const request: { cookies: { Authentication: string }; user?: unknown } = {
      cookies: { Authentication: 'access-token' },
    };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;

    const allowed = await lastValueFrom(guard.canActivate(context) as Observable<boolean>);
    return { allowed, request };
  };

  it('keeps only the id of the user, whatever else auth answers with', async () => {
    // An auth that still answers with the whole user record.
    const { allowed, request } = await authenticate({
      id: 'user-1',
      email: 'user@example.com',
      roles: ['admin'],
      notifyByEmail: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      isActive: true,
    });

    expect(allowed).toBe(true);
    expect(request.user).toEqual({ id: 'user-1' });
  });

  it.each([
    ['an empty answer', {}],
    ['no answer', null],
    ['an empty id', { id: '' }],
    ['an id that is not a string', { id: 42 }],
    ['the id inside a wrapper', { error: false, data: { id: 'user-1' } }],
  ])('rejects %s instead of letting a request through without a user id', async (_case, authAnswer) => {
    await expect(authenticate(authAnswer)).rejects.toThrow(UnauthorizedException);
  });
});
