import { Controller, NotFoundException, UseFilters, UseGuards } from '@nestjs/common';
import { ReadUserService } from './read-user.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { ResponseMessage, TCP_DB_EVENTS, tcpOk, UserResponseDto } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard, SerializerService, LoggerService } from '@app/core';
import { toUserCredentials } from '@app/postgres';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class ReadUserController {
  constructor(
    private readonly readUserService: ReadUserService,
    private readonly serializerService: SerializerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ReadUserController.name);
  }

  @MessagePattern(TCP_DB_EVENTS.USER_FIND_ONE, Transport.TCP)
  async findOne(@Payload() params: { email?: string; id?: string }) {
    const user = await this.readUserService.findOne(params);
    if (!user) throw new NotFoundException(ResponseMessage.USER_NOT_FOUND);
    return tcpOk(this.serializerService.serialize(UserResponseDto, user), ResponseMessage.USER_CREATED);
  }

  @MessagePattern(TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD, Transport.TCP)
  async findOneWithPassword(@Payload() params: { email: string }) {
    const user = await this.readUserService.findOneWithPassword(params.email);
    return tcpOk(toUserCredentials(user), ResponseMessage.USER_CREATED);
  }
}
