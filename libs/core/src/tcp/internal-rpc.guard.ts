import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class InternalRpcGuard implements CanActivate {
  private readonly expectedToken: string;

  constructor(private readonly configService: ConfigService) {
    this.expectedToken = this.configService.get<string>('INTERNAL_RPC_TOKEN') ?? '';
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<'rpc' | 'http'>() !== 'rpc') {
      return true;
    }

    const data = context.switchToRpc().getData<Record<string, unknown> | undefined>();
    const providedToken = typeof data?.serviceToken === 'string' ? data.serviceToken : undefined;

    if (!providedToken || !this.expectedToken) {
      throw new UnauthorizedException('Internal RPC token is required');
    }

    const providedBuffer = Buffer.from(providedToken, 'utf8');
    const expectedBuffer = Buffer.from(this.expectedToken, 'utf8');

    if (
      providedBuffer.length !== expectedBuffer.length
      || !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid internal RPC token');
    }

    const envelope = data as Record<string, unknown>;
    const payload = envelope.payload;
    const isObjectPayload = !!payload && typeof payload === 'object' && !Array.isArray(payload);

    // Handlers read this same object, so it is emptied and refilled in place.
    for (const key of Object.keys(envelope)) {
      if (isObjectPayload || key !== 'payload') {
        delete envelope[key];
      }
    }

    if (isObjectPayload) {
      Object.assign(envelope, payload);
    }

    return true;
  }
}