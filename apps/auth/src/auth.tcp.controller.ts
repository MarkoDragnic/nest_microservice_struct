import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type AuthenticatedUser, TCP_EVENTS, UserResponseDto } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard } from '@app/core';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class AuthTcpController {
  // JwtAuthGuard puts the user it looked up on the message. Gateway gets the id by name, nothing else.
  @UseGuards(JwtAuthGuard)
  @MessagePattern(TCP_EVENTS.AUTHENTICATE, Transport.TCP)
  async authenticate(@Payload() data: { user: UserResponseDto }): Promise<AuthenticatedUser> {
    return { id: data.user.id };
  }
}
