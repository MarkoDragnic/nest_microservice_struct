import { Controller, HttpCode, HttpStatus, InternalServerErrorException, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { type Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GatewayOnlyGuard } from './guards/gateway-only.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { CurrentUser } from '@app/core';
import { User } from '@app/postgres';
import { RefreshTokenPayload } from './interfaces/token-payload.interface';

@ApiTags('auth')
@UseGuards(GatewayOnlyGuard, ThrottlerGuard)
@Controller('auth')
export class AuthHttpController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ schema: { properties: { email: { type: 'string', example: 'user@example.com' }, password: { type: 'string', example: 'P@ssw0rd1' } } } })
  @ApiResponse({ status: 201, description: 'Login successful, cookies set' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@CurrentUser() user: User, @Res({ passthrough: true }) response: Response) {
    if (!user.id) throw new InternalServerErrorException('Authenticated user has no id');
    await this.authService.login({ id: user.id }, response);
    return { ok: true };
  }

  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Tokens refreshed, new cookies set' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @CurrentUser() payload: RefreshTokenPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.refresh(payload.userId, payload.tokenId, response);
    return { ok: true };
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Logged out, cookies cleared' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @CurrentUser() payload: RefreshTokenPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(payload.userId, payload.tokenId, response);
    return { ok: true };
  }
}

