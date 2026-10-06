import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TCP_EVENTS } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard } from '@app/core';
import { User } from '@app/postgres';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class AuthTcpController {
  @UseGuards(JwtAuthGuard)
  @MessagePattern(TCP_EVENTS.AUTHENTICATE, Transport.TCP)
  async authenticate(@Payload() data: { user: User }) {
    return data.user;
  }
}
