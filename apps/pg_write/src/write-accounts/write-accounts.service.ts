import { ConflictException, Injectable } from '@nestjs/common';
import { AccountEncryptedDto, type IEncryptedPayload, ResponseMessage } from '@app/contracts';
import { LoggerService } from '@app/core';
import { AccountsRepository, Account } from '@app/postgres';

const encryptedPayload = (payload: IEncryptedPayload): IEncryptedPayload => ({
  iv: payload.iv,
  content: payload.content,
  tag: payload.tag,
});

@Injectable()
export class WriteAccountsService {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WriteAccountsService.name);
  }

  async create(data: AccountEncryptedDto): Promise<Account> {
    try {
      return await this.accountsRepository.create({
        userId: data.userId,
        exchange: data.exchange,
        environment: data.environment,
        apiKeyEncrypted: encryptedPayload(data.apiKeyEncrypted),
        apiSecretEncrypted: encryptedPayload(data.apiSecretEncrypted),
        createdAt: data.createdAt,
        revokedAt: data.revokedAt,
      });
    } catch (error) {
      this.logger.error('Failed to create account', { error: error?.message, stack: error?.stack });
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        throw new ConflictException(ResponseMessage.ACCOUNT_ALREADY_EXISTS);
      }
      throw error;
    }
  }
}
