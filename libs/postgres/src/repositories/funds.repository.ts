import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresqlAbstractRepository } from '../postgresql-abstract.repository';
import { Funds } from '../models/funds.entity';
import { LoggerService } from '@app/core/logger';

@Injectable()
export class FundsRepository extends PostgresqlAbstractRepository<Funds> {
  constructor(
    @InjectRepository(Funds) fundsRepository: Repository<Funds>,
    protected readonly logger: LoggerService,
  ) {
    super(fundsRepository);
    this.logger.setContext(FundsRepository.name);
  }
}
