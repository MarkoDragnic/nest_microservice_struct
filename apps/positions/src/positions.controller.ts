import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { ClosePositionDto, GlobalRpcExceptionFilter, InternalRpcGuard, OpenPositionDto, ResponseMessage, TCP_EVENTS, tcpOk } from '@app/common';
import { LoggerService } from '@app/common/logger';

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
    const position = await this.positionsService.create(data);
    return tcpOk(position, ResponseMessage.POSITION_CREATED);
  }

  @MessagePattern(TCP_EVENTS.POSITION_CLOSE, Transport.TCP)
  async closePosition(@Payload() position: ClosePositionDto) {
    const closedPosition = await this.positionsService.close(position);
    return tcpOk(closedPosition, ResponseMessage.POSITION_CLOSED);
  }
}
