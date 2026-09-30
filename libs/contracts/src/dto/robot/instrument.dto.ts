import { IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class InstrumentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;
}

export class InstrumentResponseDto {
  @Expose()
  name: string;

  @Expose()
  symbol: string;
}
