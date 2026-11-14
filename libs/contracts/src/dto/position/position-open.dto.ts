import { Type } from 'class-transformer';
import {
  Equals,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PositionStatus } from '@app/contracts/types';
import { PositionRulesDto } from '@app/contracts/dto';

export class OpenPositionDto {
  @IsUUID()
  @IsNotEmpty()
  robotId: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @Equals(PositionStatus.OPEN)
  status: PositionStatus.OPEN;

  @IsNumber()
  @IsPositive()
  entryPrice: number;

  @IsDateString()
  openedAt: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionRulesDto)
  rules?: PositionRulesDto;
}
