import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBody } from '@nestjs/swagger';
import { RobotGateService } from './robot_gate.service';
import { IndicatorsUpdateDto, PaginationDto, RobotCreateDto } from '@app/contracts';
import { CurrentUser } from '@app/core';
import { User } from '@app/postgres';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OwnRobotGuard } from '../guards/own-robot.guard';

@ApiTags('robot')
@Controller('robot')
export class RobotGateController {
  constructor(private robotService: RobotGateService) {}

  @ApiOperation({ summary: 'List your trading robots (paginated)' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Paginated list of robots' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return await this.robotService.listRobots(user.id!, pagination.page, pagination.limit);
  }

  @ApiOperation({ summary: 'List positions across all your robots (paginated)' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Paginated list of positions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('positions')
  async listPositions(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return await this.robotService.listPositions(user.id!, pagination.page, pagination.limit);
  }

  @ApiOperation({ summary: 'Create a new trading robot' })
  @ApiCookieAuth()
  @ApiBody({ type: RobotCreateDto })
  @ApiResponse({ status: 201, description: 'Robot created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: User, @Body() robot: RobotCreateDto) {
    return await this.robotService.createRobot({ robot, user });
  }

  @ApiOperation({ summary: 'Update robot trading indicators' })
  @ApiCookieAuth()
  @ApiBody({ type: IndicatorsUpdateDto })
  @ApiResponse({ status: 200, description: 'Indicators updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not the robot owner' })
  @UseGuards(JwtAuthGuard, OwnRobotGuard)
  @Patch()
  async upsertIndicators(@Body() data: IndicatorsUpdateDto) {
    return await this.robotService.upsertIndicators(data);
  }
}
