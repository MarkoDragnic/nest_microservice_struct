import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresqlAbstractRepository } from '../postgresql-abstract.repository';
import { Account } from '../models';
import { LoggerService } from '@app/core/logger';

@Injectable()
export class AccountsRepository extends PostgresqlAbstractRepository<Account> {
  constructor(
    @InjectRepository(Account) accountRepo: Repository<Account>,
    protected readonly logger: LoggerService,
  ) {
    super(accountRepo);
    this.logger.setContext(AccountsRepository.name);
  }
}
