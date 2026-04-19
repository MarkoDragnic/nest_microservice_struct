import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FundsDto {
  @IsNotEmpty()
  @IsNumber()
  initial: number;

  @IsNotEmpty()
  @IsNumber()
  value: number;

  @IsNotEmpty()
  @IsString()
  base: string;

  @IsNotEmpty()
  @IsBoolean()
  dynamic: boolean;

  @IsNotEmpty()
  @IsString()
  partial: string;

  @IsNotEmpty()
  @IsNumber()
  size: number;
}
