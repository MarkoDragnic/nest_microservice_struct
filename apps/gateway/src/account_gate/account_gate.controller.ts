import { AccountCreateDto, CurrentUser, User } from '@app/common';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBody } from '@nestjs/swagger';
import { AccountGateService } from './account_gate.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('account')
@Controller('account')
export class AccountGateController {
  constructor(private readonly accountGateService: AccountGateService) {}

  @ApiOperation({ summary: 'Link a trading exchange account' })
  @ApiCookieAuth()
  @ApiBody({ type: AccountCreateDto })
  @ApiResponse({ status: 201, description: 'Account linked and credentials encrypted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@CurrentUser() user: User, @Body() account: AccountCreateDto) {
    return await this.accountGateService.create(user, account);
  }
}
