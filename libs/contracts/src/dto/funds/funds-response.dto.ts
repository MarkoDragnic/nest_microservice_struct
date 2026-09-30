import { Expose } from 'class-transformer';

export class FundsResponseDto {
  @Expose()
  id: string;

  @Expose()
  initial: number;

  @Expose()
  value: number;

  @Expose()
  base: string;

  @Expose()
  dynamic: boolean;

  @Expose()
  partial: string;

  @Expose()
  size: number;
}
