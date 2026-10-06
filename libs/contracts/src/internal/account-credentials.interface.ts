import type { IEncryptedPayload } from '../interfaces/account.interface';

export interface AccountCredentials {
  environment: string;
  // ISO timestamp: dates arrive as strings over TCP.
  revokedAt: string | null;
  apiKeyEncrypted: IEncryptedPayload;
  apiSecretEncrypted: IEncryptedPayload;
}
