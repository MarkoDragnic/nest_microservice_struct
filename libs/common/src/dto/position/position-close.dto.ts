import {
  Equals,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PositionCloseReason, PositionStatus } from '@app/common/types';

export class ClosePositionDto {
  @IsUUID()
  @IsNotEmpty()
  positionId: string;

  @IsString()
  symbol: string;

  @Equals(PositionStatus.CLOSED)
  status: PositionStatus.CLOSED;

  @IsNumber()
  @IsPositive()
  closePrice: number;

  @IsDateString()
  closedAt: string;

  @IsOptional()
  @IsEnum(PositionCloseReason)
  closeReason?: PositionCloseReason;
}
