import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { AccountCreateDto, TCP_EVENTS, type IEncryptedPayload } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard, LoggerService } from '@app/core';
import { User } from '@app/postgres';
import { CryptoService } from './crypto.service';

@UseGuards(InternalRpcGuard)
@UseFilters(GlobalRpcExceptionFilter)
@Controller()
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly cryptoService: CryptoService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AccountsController.name);
  }

  @MessagePattern(TCP_EVENTS.ACCOUNT_CREATE, Transport.TCP)
  async create(@Payload() data: { user: User; account: AccountCreateDto }) {
    return await this.accountsService.create(data.user, data.account);
  }

  @MessagePattern(TCP_EVENTS.ACCOUNT_DECRYPT, Transport.TCP)
  async decrypt(@Payload() data: IEncryptedPayload) {
    return this.cryptoService.decrypt(data);
  }
}
