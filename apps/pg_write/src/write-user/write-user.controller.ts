import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { WriteUserService } from './write-user.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { ResponseMessage, TCP_DB_EVENTS, tcpOk, UserResponseDto } from '@app/contracts';
import type { UserCreateRequest } from '@app/contracts/internal';
import { GlobalRpcExceptionFilter, InternalRpcGuard, LoggerService, SerializerService } from '@app/core';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class WriteUserController {
  constructor(
    private readonly writeUserService: WriteUserService,
    private readonly serializerService: SerializerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WriteUserController.name);
  }

  @MessagePattern(TCP_DB_EVENTS.USER_CREATE, Transport.TCP)
  async create(@Payload() data: UserCreateRequest) {
    const user = await this.writeUserService.create(data);
    return tcpOk(this.serializerService.serialize(UserResponseDto, user), ResponseMessage.USER_CREATED);
  }
}
