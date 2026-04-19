import { Injectable } from '@nestjs/common';
import { LoggerService, RedisAbstractRepository, RedisService } from '@app/common';

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
