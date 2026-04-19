import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import {
  GlobalRpcExceptionFilter,
  InternalRpcGuard,
  ResponseMessage,
  Robot,
  RobotIndicatorsUpdatePayloadDto,
  RobotResponseDto,
  SerializerService,
  TCP_DB_EVENTS,
  tcpOk,
} from '@app/common';
import { WriteRobotsService } from './write-robots.service';
import { LoggerService } from '@app/common/logger';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class WriteRobotController {
  constructor(
    private readonly writeRobotsService: WriteRobotsService,
    private readonly serializerService: SerializerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(WriteRobotController.name);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_CREATE, Transport.TCP)
  async create(@Payload() data: Robot) {
    const robot = await this.writeRobotsService.create(data);
    return tcpOk(this.serializerService.serialize(RobotResponseDto, robot), ResponseMessage.ROBOT_CREATED);
  }

  @MessagePattern(TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT, Transport.TCP)
  async upsertIndicators(@Payload() payload: RobotIndicatorsUpdatePayloadDto) {
    const robot = await this.writeRobotsService.upsertIndicators(payload);
    return tcpOk(this.serializerService.serialize(RobotResponseDto, robot), ResponseMessage.ROBOT_INDICATORS_UPDATED);
  }
}
