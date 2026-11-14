import { Injectable } from '@nestjs/common';
import { LoggerService } from '@app/core';
import { RedisAbstractRepository, RedisService } from '@app/redis';

@Injectable()
export class PriceCalculatorRepository extends RedisAbstractRepository {
  constructor(
    redisService: RedisService,
    protected readonly logger: LoggerService,
  ) {
    super(redisService);
    this.logger.setContext(PriceCalculatorRepository.name);
  }
}
