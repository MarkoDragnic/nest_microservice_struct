import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { GlobalRpcExceptionFilter, InternalRpcGuard, ResponseMessage, TCP_EVENTS, tcpOk, UserCreateDto } from '@app/common';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern(TCP_EVENTS.USER_CREATE, Transport.TCP)
  async create(@Payload() user: UserCreateDto) {
    const createdUser = await this.usersService.create(user);
    return tcpOk(createdUser, ResponseMessage.USER_CREATED);
  }
}
