import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { ClosePositionDto, OpenPositionDto, ResponseMessage, TCP_EVENTS, tcpOk } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard, LoggerService } from '@app/core';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class PositionsController {
  constructor(
    private readonly positionsService: PositionsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PositionsController.name);
  }

  @MessagePattern(TCP_EVENTS.POSITION_OPEN, Transport.TCP)
  async openPosition(@Payload() data: OpenPositionDto) {
    await this.positionsService.create(data);
    return tcpOk(null, ResponseMessage.POSITION_CREATED);
  }

  @MessagePattern(TCP_EVENTS.POSITION_CLOSE, Transport.TCP)
  async closePosition(@Payload() position: ClosePositionDto) {
    await this.positionsService.close(position);
    return tcpOk(null, ResponseMessage.POSITION_CLOSED);
  }
}
