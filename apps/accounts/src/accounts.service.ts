import { Inject, Injectable } from '@nestjs/common';
import { AccountCreateDto, AccountResponseDto, TCP_DB_EVENTS } from '@app/contracts';
import { PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
import { Account, User } from '@app/postgres';
import { CryptoService } from './crypto.service';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(PG_WRITE_SERVICE) private readonly pgWriteClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(user: User, account: AccountCreateDto): Promise<AccountResponseDto> {
    const encryptedData = {
      userId: user.id as string,
      exchange: account.exchange,
      environment: account.environment,
      apiKeyEncrypted: this.cryptoService.encrypt(account.apiKey),
      apiSecretEncrypted: this.cryptoService.encrypt(account.apiSecret),
      createdAt: new Date(),
      revokedAt: null,
    };

    return await this.tcpClientService.send<AccountResponseDto>(
      this.pgWriteClient,
      TCP_DB_EVENTS.ACCOUNT_CREATE,
      encryptedData,
    );
  }
}
