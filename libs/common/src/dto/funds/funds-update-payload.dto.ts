import { Funds } from '@app/common/models';

export class FundsUpdatePayloadDto {
  id: string;
  funds: Partial<Funds>;
}
