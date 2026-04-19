import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GlobalRpcExceptionFilter, InternalRpcGuard, TCP_EVENTS, User } from '@app/common';

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
