import { Expose, Type } from 'class-transformer';
import type { IIndicatorsConfig } from '../../interfaces/indicators-config.interface';
import { RobotTypes } from '../../types/robots/robot.types';
import { FundsResponseDto } from '../funds/funds-response.dto';
import { InstrumentResponseDto } from './instrument.dto';

// The account a robot trades on, as its owner sees it. Never the keys.
export class RobotAccountResponseDto {
  @Expose()
  id: string;

  @Expose()
  exchange: string;

  @Expose()
  environment: string;

  @Expose()
  revokedAt: string | null;
}

// A robot in the public responses: the list, create and upsert-indicators. Dates are ISO strings.
export class RobotResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  fsymbol: string;

  @Expose()
  type: RobotTypes;

  @Expose()
  assets: string;

  @Expose()
  active: boolean;

  @Expose()
  indicators: IIndicatorsConfig | null;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;

  @Expose()
  @Type(() => RobotAccountResponseDto)
  account: RobotAccountResponseDto | null;

  @Expose()
  @Type(() => FundsResponseDto)
  funds: FundsResponseDto | null;

  @Expose()
  @Type(() => InstrumentResponseDto)
  instrument: InstrumentResponseDto | null;
}
