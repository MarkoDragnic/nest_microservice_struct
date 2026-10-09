import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseMessage, RobotIndicatorsUpdatePayloadDto } from '@app/contracts';
import type { RobotCreateRequest } from '@app/contracts/internal';
import { Funds, Instrument, RobotsRepository, Robot } from '@app/postgres';

@Injectable()
export class WriteRobotsService {
  constructor(
    private readonly robotsRepository: RobotsRepository,
    @InjectRepository(Funds) private readonly fundsRepo: Repository<Funds>,
    @InjectRepository(Instrument) private readonly instrumentRepo: Repository<Instrument>,
  ) {}

  // Every field is taken from the request by name. Never spread the request: anything a caller
  // adds beyond the contract (an id, another owner, reserved funds) must not reach the tables.
  async create(request: RobotCreateRequest): Promise<Robot> {
    try {
      const funds = await this.fundsRepo.save(
        this.fundsRepo.create({
          initial: request.funds.initial,
          value: request.funds.value,
          base: request.funds.base,
          dynamic: request.funds.dynamic,
          partial: request.funds.partial,
          size: request.funds.size,
        }),
      );
      const instrument = await this.instrumentRepo.save(
        this.instrumentRepo.create({
          name: request.instrument.name,
          symbol: request.instrument.symbol,
        }),
      );

      const saved = await this.robotsRepository.create({
        owner: { id: request.owner.id },
        account: { id: request.account.id },
        hash: request.hash,
        name: request.name,
        fsymbol: request.fsymbol,
        type: request.type,
        assets: request.assets,
        active: request.active,
        funds,
        instrument,
      } as unknown as Robot);
      
      return await this.robotsRepository.findOne({ id: saved.id });
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
