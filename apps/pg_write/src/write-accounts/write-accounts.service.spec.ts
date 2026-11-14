import { Test } from '@nestjs/testing';
import { type AccountEncryptedDto, Environment, Exchange } from '@app/contracts';
import { LoggerService } from '@app/core';
import { AccountsRepository } from '@app/postgres';
import { WriteAccountsService } from './write-accounts.service';

describe('WriteAccountsService', () => {
  const accountsRepository = { create: jest.fn() };
  let service: WriteAccountsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        WriteAccountsService,
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: LoggerService, useValue: { setContext: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(WriteAccountsService);
  });

  const request: AccountEncryptedDto = {
    userId: 'user-1',
    exchange: Exchange.BINANCE,
    environment: Environment.TEST,
    apiKeyEncrypted: { iv: 'iv-1', content: 'key-content', tag: 'tag-1' },
    apiSecretEncrypted: { iv: 'iv-2', content: 'secret-content', tag: 'tag-2' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    revokedAt: null,
  };

  const expectedRow = {
    userId: 'user-1',
    exchange: 'binance',
    environment: 'test',
    apiKeyEncrypted: { iv: 'iv-1', content: 'key-content', tag: 'tag-1' },
    apiSecretEncrypted: { iv: 'iv-2', content: 'secret-content', tag: 'tag-2' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    revokedAt: null,
  };

  describe('create', () => {
    it('stores the fields of the request and returns the saved account', async () => {
      const saved = { id: 'account-1' };
      accountsRepository.create.mockResolvedValue(saved);

      const result = await service.create(request);

      expect(accountsRepository.create).toHaveBeenCalledWith(expectedRow);
      expect(result).toBe(saved);
    });

    it('applies no id or other extra field sent with the request, at the top or inside the encrypted keys', async () => {
      accountsRepository.create.mockResolvedValue({ id: 'account-1' });
      const withExtraFields = {
        ...request,
        id: 'chosen-account-id',
        user: { id: 'another-user' },
        apiKeyEncrypted: { ...request.apiKeyEncrypted, plain: 'api-key-in-clear' },
        apiSecretEncrypted: { ...request.apiSecretEncrypted, plain: 'api-secret-in-clear' },
      } as AccountEncryptedDto;

      await service.create(withExtraFields);

      expect(accountsRepository.create).toHaveBeenCalledWith(expectedRow);
    });

    it('stores revokedAt as the request gives it', async () => {
      accountsRepository.create.mockResolvedValue({ id: 'account-1' });
      const revokedAt = new Date('2026-02-01T00:00:00.000Z');

      await service.create({ ...request, revokedAt });

      expect(accountsRepository.create).toHaveBeenCalledWith({ ...expectedRow, revokedAt });
    });
  });
});
