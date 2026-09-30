import { Environment, Exchange } from '@app/contracts/types';
import type { IEncryptedPayload } from '@app/contracts/interfaces';

export class AccountEncryptedDto {
  userId: string;
  exchange: Exchange;
  environment: Environment;
  apiKeyEncrypted: IEncryptedPayload;
  apiSecretEncrypted: IEncryptedPayload;
  createdAt: Date;
  revokedAt: Date | null;
}
