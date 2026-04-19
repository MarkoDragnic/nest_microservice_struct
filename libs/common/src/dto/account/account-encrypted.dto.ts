import { Environment, Exchange } from '@app/common/types';
import type { IEncryptedPayload } from '@app/common/interfaces';

export class AccountEncryptedDto {
  userId: string;
  exchange: Exchange;
  environment: Environment;
  apiKeyEncrypted: IEncryptedPayload;
  apiSecretEncrypted: IEncryptedPayload;
  createdAt: Date;
  revokedAt: Date | null;
}
