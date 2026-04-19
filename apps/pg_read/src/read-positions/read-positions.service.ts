import { Injectable } from '@nestjs/common';
import { PaginatedResponseDto, Position, PositionsRepository } from '@app/common';

@Injectable()
export class ReadPositionsService {
  constructor(private readonly positionsRepository: PositionsRepository) {}
  async findOne(id: string) {
    return await this.positionsRepository.findOne({ id: id });
  }

  async findOpenForRobots(params: { robotIds: string[]; symbol: string }) {
    return await this.positionsRepository.findOpenForRobots(params.robotIds, params.symbol);
  }

  async findPaginated(userId: string, page: number, limit: number): Promise<PaginatedResponseDto<Position>> {
    return await this.positionsRepository.findPaginated(
      { robot: { owner: { id: userId } } } as any,
      page,
      limit,
      { robot: true },
    );
  }
}
