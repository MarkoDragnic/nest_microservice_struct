import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresqlAbstractRepository } from '@app/common/database';
import { Robot } from '@app/common/models';
import { LoggerService } from '@app/common/logger';

@Injectable()
export class RobotsRepository extends PostgresqlAbstractRepository<Robot> {
  constructor(
    @InjectRepository(Robot) robotRepository: Repository<Robot>,
    protected readonly logger: LoggerService,
  ) {
    super(robotRepository);
    this.logger.setContext(RobotsRepository.name);
  }

  async findAllActiveRobots(symbol: string): Promise<Robot[]> {
    return this.repository
      .createQueryBuilder('robot')
      .leftJoinAndSelect('robot.account', 'account')
      .leftJoinAndSelect('robot.instrument', 'instrument')
      .leftJoinAndSelect('robot.funds', 'funds')
      .innerJoinAndSelect('robot.owner', 'owner')
      .where('robot.active = true')
      .andWhere('(robot.fsymbol = :symbol OR instrument.symbol = :symbol)', { symbol })
      .getMany();
  }
}
