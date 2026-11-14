import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { TCP_DB_EVENTS } from '@app/contracts';
import type { LoggerService } from '@app/core';
import type { ClientTcpService } from '@app/messaging';
import type { ClientProxy } from '@nestjs/microservices';
import bcryptjs from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LocalStrategy } from './local.strategy';

const EMAIL = 'user@example.com';

describe('LocalStrategy', () => {
  const send = jest.fn();
  const logger = { setContext: jest.fn() };

  const strategy = new LocalStrategy(
    new UsersService(
      {} as ClientProxy,
      {} as ClientProxy,
      { send } as unknown as ClientTcpService,
      logger as unknown as LoggerService,
    ),
  );

  const answerOfLogin = (password: string) =>
    strategy.validate(EMAIL, password).then(
      () => {
        throw new Error('login was not refused');
      },
      (error: unknown) =>
        error instanceof HttpException ? { status: error.getStatus(), body: error.getResponse() } : { thrown: error },
    );

  beforeEach(() => send.mockReset());

  it('answers an inactive user the same as a wrong password', async () => {
    send.mockResolvedValueOnce({ id: 'user-1', password: bcryptjs.hashSync('right-password', 4) });
    const wrongPassword = await answerOfLogin('wrong-password');

    // What auth's TCP client throws when the credentials query finds no active user with that email.
    send.mockRejectedValueOnce(
      new RpcException({
        statusCode: 404,
        message: 'Entity not found.',
        error: true,
        event: TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD,
      }),
    );
    const inactiveUser = await answerOfLogin('right-password');

    expect(send).toHaveBeenLastCalledWith(expect.anything(), TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD, {
      email: EMAIL,
    });
    expect(wrongPassword.status).toBe(401);
    expect(inactiveUser).toEqual(wrongPassword);
  });
});
