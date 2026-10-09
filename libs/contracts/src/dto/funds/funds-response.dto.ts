import { Expose } from 'class-transformer';

// The funds of a robot in the public robot response.
export class FundsResponseDto {
  @Expose()
  initial: number;

  @Expose()
  value: number;

  @Expose()
  reserved: number;

  @Expose()
  base: string;

  @Expose()
  dynamic: boolean;

  @Expose()
  partial: string;

  @Expose()
  size: number;
}
