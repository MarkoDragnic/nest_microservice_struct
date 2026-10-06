import { Inject, Injectable } from '@nestjs/common';
import { AccountCreateDto, TCP_EVENTS, AccountResponseDto } from '@app/contracts';
import { ACCOUNTS_SERVICE, ClientTcpService } from '@app/messaging';
import { User } from '@app/postgres';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AccountGateService {
  constructor(
    @Inject(ACCOUNTS_SERVICE) private readonly accountClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async create(user: User, account: AccountCreateDto) {
    return await this.tcpClientService.send<AccountResponseDto>(this.accountClient, TCP_EVENTS.ACCOUNT_CREATE, {
      user,
      account,
    });
  }
}
