import { Injectable } from '@nestjs/common';
import { FundsUpdatePayloadDto } from '@app/contracts';
import { FundsRepository } from '@app/postgres';

@Injectable()
export class WriteFundsService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  async update(data: FundsUpdatePayloadDto) {
    return this.fundsRepository.findOneAndUpdate({ id: data.id }, data.funds);  }
}
