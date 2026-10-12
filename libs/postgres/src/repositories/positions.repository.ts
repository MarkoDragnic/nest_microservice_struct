import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PostgresqlAbstractRepository } from '../postgresql-abstract.repository';
import { Funds, Position, Robot } from '../models';
import { ClosePositionDto, OpenPositionDto } from '@app/contracts/dto';
import { PositionStatus, ResponseMessage } from '@app/contracts/types';
import { LoggerService } from '@app/core/logger';

@Injectable()
export class PositionsRepository extends PostgresqlAbstractRepository<Position> {
  constructor(
    @InjectRepository(Position) positionRepository: Repository<Position>,
    @InjectDataSource() private readonly dataSource: DataSource,
    protected readonly logger: LoggerService,
  ) {
    super(positionRepository);
    this.logger.setContext(PositionsRepository.name);
  }

  async openTransactional(data: OpenPositionDto) {
    return this.dataSource.transaction(async (manager) => {
      const robotRepository = manager.getRepository(Robot);
      const fundsRepository = manager.getRepository(Funds);
      const positionsRepository = manager.getRepository(Position);

      const lockedRobot = await this.robotLock(manager)
        .where('robot.id = :robotId', { robotId: data.robotId })
        .getOne();

      if (!lockedRobot) {
        throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
      }

      const robot = await robotRepository.findOne({
        where: { id: data.robotId },
        relations: { funds: true },
      });

      if (!robot) {
        throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
      }

      const funds = await fundsRepository.findOne({
        where: { id: robot.funds.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!funds) {
        throw new NotFoundException('Funds not found');
      }

      const openTransactionValue = this.roundMoney(data.quantity * data.entryPrice);

      if (funds.value < openTransactionValue) {
        throw new BadRequestException('Insufficient available funds');
      }

      funds.value = this.roundMoney(funds.value - openTransactionValue);
      funds.reserved = this.roundMoney(funds.reserved + openTransactionValue);
      await fundsRepository.save(funds);

      const position = positionsRepository.create({
        robot: { id: robot.id } as Robot,
        symbol: data.symbol,
        type: robot.type,
        status: data.status,
        entryPrice: data.entryPrice,
        openedAt: new Date(data.openedAt),
        quantity: data.quantity,
        openTransactionValue,
        transaction: openTransactionValue,
        rules: data.rules,
      });

      return positionsRepository.save(position);
    });
  }

  async closeTransactional(data: ClosePositionDto) {
    return this.dataSource.transaction(async (manager) => {
      const positionsRepository = manager.getRepository(Position);
      const robotRepository = manager.getRepository(Robot);
      const fundsRepository = manager.getRepository(Funds);

      const lockedRobot = await this.robotLock(manager)
        .where((robots) => {
          const robotOfPosition = robots
            .subQuery()
            .select('position.robot_id')
            .from(Position, 'position')
            .where('position.id = :positionId')
            .getQuery();
          return `robot.id = ${robotOfPosition}`;
        })
        .setParameter('positionId', data.positionId)
        .getOne();

      if (!lockedRobot) {
        throw new NotFoundException(ResponseMessage.POSITION_NOT_FOUND);
      }

      const robot = await robotRepository.findOne({
        where: { id: lockedRobot.id },
        relations: { funds: true },
      });

      if (!robot) {
        throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
      }

      const funds = await fundsRepository.findOne({
        where: { id: robot.funds.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!funds) {
        throw new NotFoundException('Funds not found');
      }

      const position = await positionsRepository
        .createQueryBuilder('position')
        .setLock('pessimistic_write')
        .where('position.id = :id', { id: data.positionId })
        .getOne();

      if (!position) {
        throw new NotFoundException(ResponseMessage.POSITION_NOT_FOUND);
      }

      if (position.status === PositionStatus.CLOSED) {
        throw new ConflictException('Position is already closed');
      }

      const openReservedValue = this.roundMoney(position.openTransactionValue ?? position.transaction ?? 0);
      if (funds.reserved < openReservedValue) {
        throw new ConflictException('Reserved funds are lower than the position open value');
      }

      const closeTransactionValue = this.roundMoney(position.quantity * data.closePrice);

      position.status = data.status;
      position.closePrice = data.closePrice;
      position.closedAt = new Date(data.closedAt);
      position.closeReason = data.closeReason ?? null;
      position.closeTransactionValue = closeTransactionValue;
      position.transaction = this.roundMoney(closeTransactionValue - openReservedValue);

      funds.value = this.roundMoney(funds.value + closeTransactionValue);
      funds.reserved = this.roundMoney(funds.reserved - openReservedValue);

      await fundsRepository.save(funds);
      return positionsRepository.save(position);
    });
  }

  async findOpenForRobots(robotIds: string[], symbol: string): Promise<Position[]> {
    if (robotIds.length === 0) return [];

    return this.repository
      .createQueryBuilder('position')
      .leftJoinAndSelect('position.robot', 'robot')
      .where('position.status = :status', { status: PositionStatus.OPEN })
      .andWhere('robot.id IN (:...robotIds)', { robotIds })
      .andWhere('position.symbol = :symbol', { symbol })
      .getMany();
  }

  // Every transaction that moves a robot's money locks the robot row first, then its funds, then the position.
  private robotLock(manager: EntityManager) {
    return manager.getRepository(Robot).createQueryBuilder('robot').select('robot.id').setLock('pessimistic_write');
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(8));
  }
}
