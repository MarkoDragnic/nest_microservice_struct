import { Controller, NotFoundException, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { PaginatedResponseDto, ResponseMessage, TCP_DB_EVENTS, tcpOk } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard } from '@app/core';
import { toManagedRobot, toRobotNotificationTarget, toRobotResponse, toTradingRobot } from '@app/postgres';
import { ReadRobotsService } from './read-robots.service';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class ReadRobotsController {
  constructor(private readonly readRobotsService: ReadRobotsService) {}

  @MessagePattern(TCP_DB_EVENTS.ROBOT_FIND_ONE, Transport.TCP)
  async findOne(@Payload() params: { id: string }) {
    const robot = await this.readRobotsService.findOne(params.id);
    if (!robot) throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
    return tcpOk(toManagedRobot(robot), ResponseMessage.ROBOT_FOUND);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_FIND_NOTIFICATION_TARGET, Transport.TCP)
  async findNotificationTarget(@Payload() params: { id: string }) {
    const robot = await this.readRobotsService.findOne(params.id);
    if (!robot) throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
    return tcpOk(toRobotNotificationTarget(robot), ResponseMessage.ROBOT_FOUND);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_FIND_ALL_BY_SYMBOL, Transport.TCP)
  async findAllBySymbol(@Payload('payload') params: string) {
    const robots = await this.readRobotsService.findAllActiveBySymbol(params);
    return tcpOk(robots.map(toTradingRobot), ResponseMessage.ROBOT_FOUND);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_FIND_PAGINATED, Transport.TCP)
  async findPaginated(@Payload() params: { userId: string; page: number; limit: number }) {
    const result = await this.readRobotsService.findPaginated(params.userId, params.page, params.limit);
    const robots = new PaginatedResponseDto(result.data.map(toRobotResponse), result.total, result.page, result.limit);
    return tcpOk(robots, ResponseMessage.ROBOTS_LISTED);
  }
}
