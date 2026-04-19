import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import {
  ClosePositionDto,
  GlobalRpcExceptionFilter,
  InternalRpcGuard,
  OpenPositionDto,
  ResponseMessage,
  TCP_DB_EVENTS,
  tcpOk,
} from '@app/common';
import { WritePositionsService } from './write-positions.service';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class WritePositionsController {
  constructor(private readonly writePositionsService: WritePositionsService) {}

  @MessagePattern(TCP_DB_EVENTS.POSITION_OPEN_TRANSACTIONAL, Transport.TCP)
  async openTransactional(@Payload() data: OpenPositionDto) {
    const position = await this.writePositionsService.openTransactional(data);
    return tcpOk(position, ResponseMessage.POSITION_CREATED);
  }

  @MessagePattern(TCP_DB_EVENTS.POSITION_CLOSE_TRANSACTIONAL, Transport.TCP)
  async closeTransactional(@Payload() data: ClosePositionDto) {
    const position = await this.writePositionsService.closeTransactional(data);
    return tcpOk(position, ResponseMessage.POSITION_CLOSED);
  }
}
