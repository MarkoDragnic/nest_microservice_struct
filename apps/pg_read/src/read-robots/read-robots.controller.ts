import { Controller, NotFoundException, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { ResponseMessage, RobotResponseDto, RobotTradingResponseDto, TCP_DB_EVENTS, tcpOk } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard, SerializerService } from '@app/core';
import { ReadRobotsService } from './read-robots.service';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class ReadRobotsController {
  constructor(
    private readonly readRobotsService: ReadRobotsService,
    private readonly serializerService: SerializerService,
  ) {}

  @MessagePattern(TCP_DB_EVENTS.ROBOT_FIND_ONE, Transport.TCP)
  async findOne(@Payload() params: { id: string }) {
    const robot = await this.readRobotsService.findOne(params.id);
    if (!robot) throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
    return tcpOk(this.serializerService.serialize(RobotResponseDto, robot), ResponseMessage.ROBOT_FOUND);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_FIND_ALL_BY_SYMBOL, Transport.TCP)
  async findAllBySymbol(@Payload('payload') params: string) {
    const robots = await this.readRobotsService.findAllActiveBySymbol(params);
    return tcpOk(this.serializerService.serialize(RobotTradingResponseDto, robots), ResponseMessage.ROBOT_FOUND);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_FIND_PAGINATED, Transport.TCP)
  async findPaginated(@Payload() params: { userId: string; page: number; limit: number }) {
    const result = await this.readRobotsService.findPaginated(params.userId, params.page, params.limit);
    return tcpOk(
      { ...result, data: this.serializerService.serialize(RobotResponseDto, result.data) },
      ResponseMessage.ROBOTS_LISTED,
    );
  }
}
