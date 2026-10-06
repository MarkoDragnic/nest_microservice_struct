import { Injectable } from '@nestjs/common';
import { ClosePositionDto, OpenPositionDto } from '@app/contracts';
import { PositionsRepository } from '@app/postgres';

@Injectable()
export class WritePositionsService {
  constructor(private readonly positionsRepository: PositionsRepository) {}

  async openTransactional(data: OpenPositionDto) {
    return this.positionsRepository.openTransactional(data);
  }

  async closeTransactional(data: ClosePositionDto) {
    return this.positionsRepository.closeTransactional(data);
  }
}
