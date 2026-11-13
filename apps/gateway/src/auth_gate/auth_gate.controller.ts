import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBody } from '@nestjs/swagger';

/**
 * Swagger-only controller that documents the /auth/* routes.
 *
 * Requests never reach these handlers: the AuthProxyMiddleware
 * intercepts them first and forwards to the auth microservice.
 * This controller exists solely so the OpenAPI spec includes
 * the auth endpoints.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthGateController {
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        password: { type: 'string', example: 'P@ssw0rd1' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Login successful, Authentication and Refresh cookies set' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  login() {
    /* handled by AuthProxyMiddleware */
  }

  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Tokens refreshed, new cookies set' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh() {
    /* handled by AuthProxyMiddleware */
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Logged out, cookies cleared' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout() {
    /* handled by AuthProxyMiddleware */
  }
}
