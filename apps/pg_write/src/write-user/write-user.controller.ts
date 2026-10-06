import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { WriteUserService } from './write-user.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { ResponseMessage, TCP_DB_EVENTS, tcpOk } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard, LoggerService } from '@app/core';
import { User } from '@app/postgres';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class WriteUserController {
  constructor(
    private readonly writeUserService: WriteUserService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WriteUserController.name);
  }

  @MessagePattern(TCP_DB_EVENTS.USER_CREATE, Transport.TCP)
  async create(@Payload() data: User) {
    const user = await this.writeUserService.create(data);
    return tcpOk(user, ResponseMessage.USER_CREATED);
  }
}
