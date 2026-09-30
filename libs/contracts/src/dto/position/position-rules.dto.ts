import { Type } from 'class-transformer';
import { IsDefined, IsNotEmptyObject, ValidateNested } from 'class-validator';
import { CloseDto, OpenDto } from '@app/contracts/dto';
import type { IIndicatorsConfig } from '@app/contracts/interfaces';

export class PositionRulesDto implements IIndicatorsConfig {
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
