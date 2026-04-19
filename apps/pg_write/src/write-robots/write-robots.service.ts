import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Funds, Instrument, ResponseMessage, RobotIndicatorsUpdatePayloadDto, RobotsRepository } from '@app/common';
import { Robot } from '@app/common/models';

@Injectable()
export class WriteRobotsService {
  constructor(
    private readonly robotsRepository: RobotsRepository,
    @InjectRepository(Funds) private readonly fundsRepo: Repository<Funds>,
    @InjectRepository(Instrument) private readonly instrumentRepo: Repository<Instrument>,
  ) {}

  async create(robot: Robot): Promise<Robot> {
    try {
      const funds = await this.fundsRepo.save(
        this.fundsRepo.create(robot.funds as DeepPartial<Funds>) as Funds,
      );
      const instrument = await this.instrumentRepo.save(
        this.instrumentRepo.create(robot.instrument as DeepPartial<Instrument>) as Instrument,
      );

      return await this.robotsRepository.create({
        ...robot,
        funds,
        instrument,
      } as unknown as Robot);
    } catch (error: unknown) {
      const isDuplicate =
        error instanceof Error &&
        ((error as Error & { code?: string }).code === '23505' ||
          error.message.includes('duplicate key'));
      if (isDuplicate) {
        throw new ConflictException(ResponseMessage.ROBOT_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async upsertIndicators(payload: RobotIndicatorsUpdatePayloadDto): Promise<Robot> {
    const robot = await this.robotsRepository.findOneAndUpdate(
      { id: payload.robotId },
      { indicators: payload.indicators },
    );
    if (!robot) {
      throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
    }
    return robot;
  }
}
