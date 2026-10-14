import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type AccountCreateDto, TCP_DB_EVENTS } from '@app/contracts';
import { LoggerService, InternalRpcGuard } from '@app/core';
import { ClientTcpService, PG_WRITE_SERVICE } from '@app/messaging';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { CryptoService } from './crypto.service';

describe('AccountsController', () => {
  const pgWriteClient = { name: 'pg_write' };
  const tcpClientService = { send: jest.fn() };
  const cryptoService = {
    encrypt: (value: string) => ({ iv: 'iv', content: `encrypted:${value}`, tag: 'tag' }),
  };
  let accountsController: AccountsController;

  beforeEach(async () => {
    jest.resetAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        AccountsService,
        { provide: CryptoService, useValue: cryptoService },
        { provide: PG_WRITE_SERVICE, useValue: pgWriteClient },
        { provide: ClientTcpService, useValue: tcpClientService },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    accountsController = app.get<AccountsController>(AccountsController);
  });

  it('should be defined', () => {
    expect(accountsController).toBeDefined();
  });

  describe('create', () => {
    const accountBody: AccountCreateDto = {
      exchange: 'binance',
      environment: 'test',
      apiKey: 'key-1',
      apiSecret: 'secret-1',
    };

    const expectedRequest = {
      userId: 'user-1',
      exchange: 'binance',
      environment: 'test',
      apiKeyEncrypted: { iv: 'iv', content: 'encrypted:key-1', tag: 'tag' },
      apiSecretEncrypted: { iv: 'iv', content: 'encrypted:secret-1', tag: 'tag' },
      createdAt: expect.any(Date),
      revokedAt: null,
    };

    it('asks pg_write to create the account for the authenticated user and returns its answer', async () => {
      const created = { id: 'account-1', exchange: 'binance' };
      tcpClientService.send.mockResolvedValue(created);
      const message = { user: { id: 'user-1' }, userId: 'user-1', account: accountBody };

      const result = await accountsController.create(message);

      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ACCOUNT_CREATE, expectedRequest);
      expect(result).toBe(created);
    });

    it('takes the owner from userId, not from user', async () => {
      tcpClientService.send.mockResolvedValue({ id: 'account-1' });
      const message = { user: { id: 'another-user' }, userId: 'user-1', account: accountBody };

      await accountsController.create(message);

      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ACCOUNT_CREATE, expectedRequest);
    });

    it('creates the account from a message that carries userId and no user', async () => {
      tcpClientService.send.mockResolvedValue({ id: 'account-1' });

      await accountsController.create({ userId: 'user-1', account: accountBody });

      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ACCOUNT_CREATE, expectedRequest);
    });

    it.each([
      ['missing', undefined],
      ['an empty string', ''],
      ['an object', { id: 'user-1' }],
    ])('refuses a create message whose userId is %s, without falling back to user', async (_case, userId) => {
      const message = { user: { id: 'user-1' }, userId: userId as string, account: accountBody };

      const attempt = accountsController.create(message);

      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow('User id is required');
      expect(tcpClientService.send).not.toHaveBeenCalled();
    });
  });
});
