import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../user/user-response.dto';
import { AccountResponseDto } from '../account/account-response.dto';
import { InstrumentResponseDto } from './instrument.dto';
import { type IEncryptedPayload, type IIndicatorsConfig } from '@app/contracts/interfaces';
import { FundsResponseDto } from '@app/contracts/dto';

export class AccountCredentialsResponseDto extends AccountResponseDto {
  @Expose()
  apiKeyEncrypted: IEncryptedPayload;

  @Expose()
  apiSecretEncrypted: IEncryptedPayload;
}

export class RobotResponseDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => UserResponseDto)
  owner: UserResponseDto;

  @Expose()
  fsymbol: string;

  @Expose()
  name: string;

  @Expose()
  type: string;

  @Expose()
  assets: string;

  @Expose()
  active: boolean;

  @Expose()
  @Type(() => AccountResponseDto)
  account: AccountResponseDto;

  @Expose()
  hash: string;

  @Expose()
  @Type(() => FundsResponseDto)
  funds: FundsResponseDto;

  @Expose()
  @Type(() => InstrumentResponseDto)
  instrument: InstrumentResponseDto;

  @Expose()
  indicators?: IIndicatorsConfig;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class RobotTradingResponseDto extends RobotResponseDto {
  @Expose()
  @Type(() => AccountCredentialsResponseDto)
  declare account: AccountCredentialsResponseDto;
}
