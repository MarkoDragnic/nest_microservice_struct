import { createCipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEncryptedPayload } from '@app/contracts';
import * as crypto from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm: string = 'aes-256-gcm';
  private readonly keyBuffer: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_CREDENTIAL_KEY');

    if (!encryptionKey) throw new Error('ENCRYPTION_CREDENTIAL_KEY missing');

    this.keyBuffer = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(key: string): IEncryptedPayload {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.keyBuffer, iv) as crypto.CipherGCM;

    const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(encryptedPayload: IEncryptedPayload): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.keyBuffer,
      Buffer.from(encryptedPayload.iv, 'hex'),
    ) as crypto.DecipherGCM;

    decipher.setAuthTag(Buffer.from(encryptedPayload.tag, 'hex'));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedPayload.content, 'hex')), decipher.final()]);

    return decrypted.toString('utf8');
  }
}
