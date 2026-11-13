import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class GatewayOnlyGuard implements CanActivate {
  private readonly allowedIps: string[];
  private readonly isProduction: boolean;
  private readonly logger = new Logger(GatewayOnlyGuard.name);

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const raw = this.configService.get<string>('ALLOWED_GATEWAY_IPS', '');
    this.allowedIps = raw
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    if (this.isProduction && this.allowedIps.length === 0) {
      throw new Error(
        'ALLOWED_GATEWAY_IPS must be configured in production. ' +
          'Set it to a comma-separated list of gateway container IPs.',
      );
    }

    if (!this.isProduction && this.allowedIps.length === 0) {
      this.logger.warn(
        'ALLOWED_GATEWAY_IPS is not set — auth service is directly reachable from any host. ' +
          'Acceptable in development; must be restricted before production.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.allowedIps.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();

    const rawIp = request.socket.remoteAddress ?? '';

    const ip = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;

    if (!this.allowedIps.includes(ip)) {
      throw new ForbiddenException('Direct access to the auth service is not permitted');
    }

    return true;
  }
}
