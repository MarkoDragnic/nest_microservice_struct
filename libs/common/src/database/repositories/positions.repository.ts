import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PostgresqlAbstractRepository } from '@app/common/database';
import { Funds, Position, Robot } from '@app/common/models';
import { ClosePositionDto, OpenPositionDto } from '@app/contracts/dto';
import { PositionStatus, ResponseMessage } from '@app/contracts/types';
import { LoggerService } from '@app/common/logger';

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

      const position = await positionsRepository
        .createQueryBuilder('position')
        .innerJoinAndSelect('position.robot', 'robot')
        .setLock('pessimistic_write')
        .where('position.id = :id', { id: data.positionId })
        .getOne();

      if (!position) {
        throw new NotFoundException(ResponseMessage.POSITION_NOT_FOUND);
      }

      if (position.status === PositionStatus.CLOSED) {
        throw new ConflictException('Position is already closed');
      }

      const robot = await robotRepository.findOne({
        where: { id: position.robot.id },
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

  private roundMoney(value: number) {
    return Number(value.toFixed(8));
  }
}
