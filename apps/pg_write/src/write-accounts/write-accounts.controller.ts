import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { WriteAccountsService } from './write-accounts.service';
import { AccountEncryptedDto, AccountResponseDto, GlobalRpcExceptionFilter, InternalRpcGuard, ResponseMessage, SerializerService, TCP_DB_EVENTS, tcpOk } from '@app/common';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class WriteAccountsController {
  constructor(
    private readonly accountsWriteService: WriteAccountsService,
    private readonly serializerService: SerializerService,
  ) {}

  @MessagePattern(TCP_DB_EVENTS.ACCOUNT_CREATE, Transport.TCP)
  async create(@Payload() data: AccountEncryptedDto) {
    const account = await this.accountsWriteService.create(data);
    return tcpOk(this.serializerService.serialize(AccountResponseDto, account), ResponseMessage.ACCOUNT_CREATED);
  }
}
