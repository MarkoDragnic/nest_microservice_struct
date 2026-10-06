import { Injectable } from '@nestjs/common';
import { PaginatedResponseDto } from '@app/contracts';
import { RobotsRepository, Robot } from '@app/postgres';

@Injectable()
export class ReadRobotsService {
  constructor(private readonly robotsRepository: RobotsRepository) {}
  async findOne(id: string) {
    return await this.robotsRepository.findOne({ id });
  }

  async findAllActiveBySymbol(params: string) {
    return await this.robotsRepository.findAllActiveRobots(params);
  }

  async findPaginated(userId: string, page: number, limit: number): Promise<PaginatedResponseDto<Robot>> {
    return await this.robotsRepository.findPaginated(
      { owner: { id: userId } } as any,
      page,
      limit,
      { instrument: true, funds: true },
    );
  }
}
