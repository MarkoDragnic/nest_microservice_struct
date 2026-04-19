import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FundsDto } from '../funds/funds.dto';
import { InstrumentDto } from './instrument.dto';
import { RobotTypes } from '@app/common/types';

export class RobotCreateDto {
  @ApiProperty({ example: 'BTC Scalper' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'BTCUSDT' })
  @IsString()
  @IsNotEmpty()
  fsymbol!: string;

  @ApiProperty({ enum: RobotTypes, example: RobotTypes.TEST })
  @IsString()
  @IsNotEmpty()
  @IsEnum(RobotTypes)
  type!: string;

  @ApiProperty({ example: 'USDT' })
  @IsString()
  @IsNotEmpty()
  assets!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Type(() => Boolean)
  active!: boolean;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsDefined()
  @IsUUID()
  accountId!: string;

  @ApiProperty({ type: FundsDto })
  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => FundsDto)
  funds!: FundsDto;

  @ApiProperty({ type: InstrumentDto })
  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => InstrumentDto)
  instrument!: InstrumentDto;
}
