import { Expose } from 'class-transformer';
import { Environment, Exchange } from '@app/contracts/types';

export class AccountResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  exchange: Exchange;

  @Expose()
  environment: Environment;

  @Expose()
  createdAt: Date;

  @Expose()
  revokedAt?: Date | null;
}
