import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AccountCreateDto, AccountResponseDto, ResponseMessage, TCP_DB_EVENTS } from '@app/contracts';
import { PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
import { CryptoService } from './crypto.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(PG_WRITE_SERVICE) private readonly pgWriteClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(userId: string, account: AccountCreateDto): Promise<AccountResponseDto> {
    if (typeof userId !== 'string' || userId === '') {
      throw new BadRequestException(ResponseMessage.USER_ID_REQUIRED);
    }

    const encryptedData = {
      userId,
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
