import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { RobotsService } from './robots.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { IndicatorsUpdateDto, ResponseMessage, type RobotCreateData, TCP_EVENTS, tcpOk } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard, LoggerService } from '@app/core';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class RobotsController {
  constructor(
    private readonly robotsService: RobotsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(RobotsController.name);
  }

  @MessagePattern(TCP_EVENTS.ROBOT_CREATE, Transport.TCP)
  async create(@Payload() data: RobotCreateData) {
    const createdRobot = await this.robotsService.create(data);
    return tcpOk(createdRobot, ResponseMessage.ROBOT_CREATED);
  }

  @MessagePattern(TCP_EVENTS.ROBOT_INDICATORS_UPSERT, Transport.TCP)
  async upsertIndicators(@Payload() indicators: IndicatorsUpdateDto) {
    const updatedRobot = await this.robotsService.upsertIndicators(indicators);
    return tcpOk(updatedRobot, ResponseMessage.ROBOT_INDICATORS_UPDATED);
  }

  @MessagePattern(TCP_EVENTS.ROBOT_GET_OWNER, Transport.TCP)
  async getOwner(@Payload() payload: { robot: string }) {
    const owner = await this.robotsService.getOwner(payload.robot);
    return tcpOk({ owner }, ResponseMessage.ROBOT_OWNER_FETCHED);
  }
}
