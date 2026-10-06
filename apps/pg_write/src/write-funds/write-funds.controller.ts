import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { WriteFundsService } from './write-funds.service';
import { FundsUpdatePayloadDto, ResponseMessage, TCP_DB_EVENTS, tcpOk } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard } from '@app/core';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller('write-funds')
export class WriteFundsController {
  constructor(private readonly writeFundsService: WriteFundsService) {}

  @MessagePattern(TCP_DB_EVENTS.FUNDS_UPDATE, Transport.TCP)
  async update(@Payload() data: FundsUpdatePayloadDto) {
    const funds = await this.writeFundsService.update(data);
    return tcpOk(funds, ResponseMessage.FUNDS_UPDATED);
  }
}
