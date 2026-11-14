import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Environment, Exchange } from '@app/contracts/types';

export class AccountCreateDto {
  @ApiProperty({ enum: Exchange, example: Exchange.BINANCE })
  @IsNotEmpty()
  @IsString()
  @IsEnum(Exchange)
  exchange: string;

  @ApiProperty({ enum: Environment, example: Environment.TEST })
  @IsNotEmpty()
  @IsString()
  @IsEnum(Environment)
  environment: string;

  @ApiProperty({ example: 'your-api-key', maxLength: 256 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  apiKey: string;

  @ApiProperty({ example: 'your-api-secret', maxLength: 256 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  apiSecret: string;
}
