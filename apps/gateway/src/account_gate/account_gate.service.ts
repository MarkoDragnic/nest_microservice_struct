import { Inject, Injectable } from '@nestjs/common';
import { AccountCreateDto, ACCOUNTS_SERVICE, TCP_EVENTS, User } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { AccountResponseDto } from '@app/common/dto/account/account-response.dto';
import { ClientTcpService } from '@app/common/clients/client-tcp.service';

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
