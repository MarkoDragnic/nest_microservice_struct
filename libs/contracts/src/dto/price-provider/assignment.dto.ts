import { IsEnum, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignmentCommandDto {
  @IsEnum(['subscribe', 'unsubscribe'])
  type: 'subscribe' | 'unsubscribe';

  @IsString()
  @MinLength(1)
  symbol: string;
}

export class AssignmentDto {
  @IsString()
  @MinLength(1)
  providerId: string;

  @ValidateNested()
  @Type(() => AssignmentCommandDto)
  command: AssignmentCommandDto;
}
