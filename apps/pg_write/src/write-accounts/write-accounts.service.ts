import { ConflictException, Injectable } from '@nestjs/common';
import { AccountEncryptedDto, AccountsRepository, ResponseMessage } from '@app/common';
import { Account } from '@app/common/models';
import { LoggerService } from '@app/common/logger';

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
