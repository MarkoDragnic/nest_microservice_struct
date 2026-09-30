import { FundsDto } from './funds.dto';

export class FundsUpdatePayloadDto {
  id: string;
  funds: Partial<FundsDto & { reserved: number }>;
}
