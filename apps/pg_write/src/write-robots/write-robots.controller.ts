import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { ResponseMessage, RobotIndicatorsUpdatePayloadDto, TCP_DB_EVENTS, tcpOk } from '@app/contracts';
import type { RobotCreateRequest } from '@app/contracts/internal';
import { GlobalRpcExceptionFilter, InternalRpcGuard, LoggerService } from '@app/core';
import { toRobotResponse } from '@app/postgres';
import { WriteRobotsService } from './write-robots.service';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class WriteRobotController {
  constructor(
    private readonly writeRobotsService: WriteRobotsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WriteRobotController.name);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_CREATE, Transport.TCP)
  async create(@Payload() data: RobotCreateRequest) {
    const robot = await this.writeRobotsService.create(data);
    return tcpOk(toRobotResponse(robot), ResponseMessage.ROBOT_CREATED);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT, Transport.TCP)
  async upsertIndicators(@Payload() payload: RobotIndicatorsUpdatePayloadDto) {
    const robot = await this.writeRobotsService.upsertIndicators(payload);
    return tcpOk(toRobotResponse(robot), ResponseMessage.ROBOT_INDICATORS_UPDATED);
  }
}
