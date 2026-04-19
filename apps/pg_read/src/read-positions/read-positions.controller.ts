import { Controller, NotFoundException, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { GlobalRpcExceptionFilter, InternalRpcGuard, ResponseMessage, TCP_DB_EVENTS, tcpOk } from '@app/common';
import { ReadPositionsService } from './read-positions.service';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class ReadPositionsController {
  constructor(private readonly readPositionService: ReadPositionsService) {}

  @MessagePattern(TCP_DB_EVENTS.POSITION_FIND_ONE, Transport.TCP)
  async findOne(@Payload() params: { id: string }) {
    const position = await this.readPositionService.findOne(params.id);
    if (!position) throw new NotFoundException(ResponseMessage.POSITION_NOT_FOUND);
    return tcpOk(position, ResponseMessage.POSITION_FOUND);
  }

  @MessagePattern(TCP_DB_EVENTS.POSITION_OPEN_FOR_ROBOTS, Transport.TCP)
  async findOpenForRobot(@Payload() params: { robotIds: string[]; symbol: string }) {
    const position = await this.readPositionService.findOpenForRobots(params);
    return tcpOk(position, ResponseMessage.POSITION_FOUND);
  }

  @MessagePattern(TCP_DB_EVENTS.POSITION_FIND_PAGINATED, Transport.TCP)
  async findPaginated(@Payload() params: { userId: string; page: number; limit: number }) {
    const result = await this.readPositionService.findPaginated(params.userId, params.page, params.limit);
    return tcpOk(result, ResponseMessage.POSITIONS_LISTED);
  }
}
