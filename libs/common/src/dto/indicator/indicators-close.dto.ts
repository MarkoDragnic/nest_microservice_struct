import { IsDefined, IsNotEmptyObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  HlIndicatorDto,
  ProfitIndicatorDto,
  RsiIndicatorDto,
} from '@app/common/dto';
import type { ICloseIndicators } from '@app/common/interfaces';

export class CloseDto implements ICloseIndicators {
  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => ProfitIndicatorDto)
  take_profit: ProfitIndicatorDto;

  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => ProfitIndicatorDto)
  stop_lose: ProfitIndicatorDto;

  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => ProfitIndicatorDto)
  min_profit: ProfitIndicatorDto;

  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => RsiIndicatorDto)
  rsi: RsiIndicatorDto;

  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => HlIndicatorDto)
  hl: HlIndicatorDto;
}
