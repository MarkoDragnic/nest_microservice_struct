import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ResponseMessage, RobotIndicatorsUpdatePayloadDto } from '@app/contracts';
import type { RobotCreateRequest } from '@app/contracts/internal';
import { Account, Funds, Instrument, RobotsRepository, Robot } from '@app/postgres';

const isId = (value: unknown): value is string => typeof value === 'string' && value !== '';

@Injectable()
export class WriteRobotsService {
  constructor(
    private readonly robotsRepository: RobotsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // Every field is taken from the request by name. Never spread the request: anything a caller
  // adds beyond the contract (an id, another owner, reserved funds) must not reach the tables.
  async create(request: RobotCreateRequest): Promise<Robot> {
    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        await this.requireAccountOfOwner(manager, request.account?.id, request.owner?.id);

        const fundsRepo = manager.getRepository(Funds);
        const funds = await fundsRepo.save(
          fundsRepo.create({
            initial: request.funds.initial,
            value: request.funds.value,
            base: request.funds.base,
            dynamic: request.funds.dynamic,
            partial: request.funds.partial,
            size: request.funds.size,
          }),
        );
        const instrumentRepo = manager.getRepository(Instrument);
        const instrument = await instrumentRepo.save(
          instrumentRepo.create({
            name: request.instrument.name,
            symbol: request.instrument.symbol,
          }),
        );

        const robotRepo = manager.getRepository(Robot);
        return robotRepo.save(
          robotRepo.create({
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
          } as unknown as Robot),
        );
      });

      return await this.robotsRepository.findOne({ id: saved.id });
    } catch (error: unknown) {
      const isDuplicate =
        error instanceof Error &&
        ((error as Error & { code?: string }).code === '23505' || error.message.includes('duplicate key'));
      if (isDuplicate) {
        throw new ConflictException(ResponseMessage.ROBOT_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  private async requireAccountOfOwner(manager: EntityManager, accountId: unknown, ownerId: unknown): Promise<void> {
    const account =
      isId(accountId) && isId(ownerId)
        ? await manager.getRepository(Account).findOne({ where: { id: accountId, userId: ownerId } })
        : null;

    if (!account) {
      throw new NotFoundException(ResponseMessage.ACCOUNT_NOT_FOUND);
    }
  }

  async upsertIndicators(payload: RobotIndicatorsUpdatePayloadDto): Promise<Robot> {
    const { robotId, ownerId } = payload;
    const updated =
      isId(robotId) && isId(ownerId)
        ? await this.dataSource
            .getRepository(Robot)
            .update({ id: robotId, owner: { id: ownerId } }, { indicators: payload.indicators })
        : null;

    if (!updated?.affected) {
      throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
    }
    return this.robotsRepository.findOne({ id: robotId });
  }
}
