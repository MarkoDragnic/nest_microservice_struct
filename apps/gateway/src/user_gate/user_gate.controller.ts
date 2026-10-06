import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserCreateDto, UserResponseDto } from '@app/contracts';
import { Serializer } from '@app/core';
import { UserGateService } from './user_gate.service';

@ApiTags('user')
@Controller('user')
export class UserGateController {
  constructor(private readonly userGateService: UserGateService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: UserCreateDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Serializer(UserResponseDto)
  @Post()
  async create(@Body() data: UserCreateDto) {
    return await this.userGateService.create(data);
  }
}
