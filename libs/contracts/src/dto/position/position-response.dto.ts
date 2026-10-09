import { Expose, Type } from 'class-transformer';
import { PositionCloseReason, PositionStatus } from '../../types/positions/position.types';
import { RobotTypes } from '../../types/robots/robot.types';

// The robot a listed position belongs to: which robot it is, nothing about its owner, account or funds.
export class PositionRobotResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

// One position in the public list (GET /robot/positions). Dates are ISO strings.
export class PositionResponseDto {
  @Expose()
  id: string;

  @Expose()
  symbol: string;

  @Expose()
  type: RobotTypes;

  @Expose()
  status: PositionStatus;

  @Expose()
  entryPrice: number;

  @Expose()
  closePrice: number | null;

  @Expose()
  quantity: number;

  @Expose()
  openTransactionValue: number | null;

  @Expose()
  closeTransactionValue: number | null;

  @Expose()
  closeReason: PositionCloseReason | null;

  @Expose()
  openedAt: string;

  @Expose()
  closedAt: string | null;

  @Expose()
  @Type(() => PositionRobotResponseDto)
  robot: PositionRobotResponseDto;
}
