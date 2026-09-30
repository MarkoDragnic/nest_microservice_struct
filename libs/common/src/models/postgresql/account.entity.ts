import { Column, Entity, Unique } from 'typeorm';
import { AbstractEntity } from '@app/common/database/postgresql';
import type { IEncryptedPayload } from '@app/contracts/interfaces';

@Entity({ name: 'account' })
@Unique('UQ_account_user_exchange_environment', ['userId', 'exchange', 'environment'])
export class Account extends AbstractEntity<Account> {
  @Column('text', { name: 'user_id' })
  userId: string;

  @Column('text', { name: 'exchange' })
  exchange: string;

  @Column('text', { name: 'environment' })
  environment: string;

  @Column('jsonb', { name: 'api_key_encrypted' })
  apiKeyEncrypted: IEncryptedPayload;

  @Column('jsonb', { name: 'api_secret_encrypted' })
  apiSecretEncrypted: IEncryptedPayload;

  @Column('timestamp', {
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column('timestamp', { name: 'revoked_at', nullable: true })
  revokedAt: Date | null;
}
