import { Injectable } from '@nestjs/common';
import { ClosePositionDto, OpenPositionDto, PositionsRepository } from '@app/common';

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
