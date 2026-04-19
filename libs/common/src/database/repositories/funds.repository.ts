import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresqlAbstractRepository } from '@app/common/database';
import { Funds } from '@app/common/models/postgresql/funds.entity';
import { LoggerService } from '@app/common/logger';

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
