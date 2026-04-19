import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Transport } from '@nestjs/microservices';
import { TCP_EVENTS } from '../tcp/tcp-events';
import { InternalRpcGuard } from '../tcp/internal-rpc.guard';
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
