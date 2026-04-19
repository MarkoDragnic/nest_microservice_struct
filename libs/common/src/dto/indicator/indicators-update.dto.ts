import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RsiRule, HlRule, ProfitFactor } from '@app/common/types';
import { IIndicator } from '@app/common';
import { CloseDto, OpenDto } from '@app/common/dto';
import type { IHlIndicator, IProfitIndicator, IRsiIndicator } from '@app/common/interfaces';

export class RsiIndicatorDto implements IIndicator, IRsiIndicator {
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  period: number;

  @IsEnum(RsiRule)
  rule: RsiRule;

  @IsNumber()
  value: number;
}

export class HlIndicatorDto implements IIndicator, IHlIndicator {
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  period: number;

  @IsEnum(HlRule)
  rule: HlRule;

  @IsNumber()
  value: number;
}

export class ProfitIndicatorDto implements IProfitIndicator {
  @IsBoolean()
  enabled: boolean;

  @IsEnum(ProfitFactor)
  factor: ProfitFactor;

  @IsNumber()
  value: number;
}

export class IndicatorsUpdateDto {
  @IsUUID()
  @IsNotEmpty()
  robotId: string;

  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => OpenDto)
  open: OpenDto;

  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => CloseDto)
  close: CloseDto;
}
