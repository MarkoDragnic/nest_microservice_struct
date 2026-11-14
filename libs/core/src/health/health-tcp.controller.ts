import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { TCP_EVENTS } from '@app/contracts/tcp';
import { InternalRpcGuard } from '../tcp';
import { GlobalRpcExceptionFilter } from '../filters/rpc-exception.filter';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class HealthTcpController {
  @MessagePattern(TCP_EVENTS.HEALTH_CHECK, Transport.TCP)
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
