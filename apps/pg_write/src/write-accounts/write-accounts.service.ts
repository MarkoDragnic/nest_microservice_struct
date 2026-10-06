import { ConflictException, Injectable } from '@nestjs/common';
import { AccountEncryptedDto, ResponseMessage } from '@app/contracts';
import { LoggerService } from '@app/core';
import { AccountsRepository, Account } from '@app/postgres';

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
      return await this.accountsRepository.create(data);
    } catch (error) {
      this.logger.error('Failed to create account', { error: error?.message, stack: error?.stack });
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        throw new ConflictException(ResponseMessage.ACCOUNT_ALREADY_EXISTS);
      }
      throw error;
    }
  }
}
