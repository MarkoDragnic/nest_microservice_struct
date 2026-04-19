import { IsDefined, IsNotEmptyObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HlIndicatorDto, RsiIndicatorDto } from '@app/common/dto';
import type { IOpenIndicators } from '@app/common/interfaces';

export class OpenDto implements IOpenIndicators {
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
