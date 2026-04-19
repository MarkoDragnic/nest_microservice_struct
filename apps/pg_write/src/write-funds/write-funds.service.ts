import { Injectable } from '@nestjs/common';
import { FundsRepository, FundsUpdatePayloadDto } from '@app/common';

@Injectable()
export class WriteFundsService {
  constructor(private readonly fundsRepository: FundsRepository) {}

  async update(data: FundsUpdatePayloadDto) {
    return this.fundsRepository.findOneAndUpdate({ id: data.id }, data.funds);  }
}
