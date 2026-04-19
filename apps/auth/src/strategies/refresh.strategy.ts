import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IRefreshTokenPayload, RefreshTokenPayload } from '../interfaces/token-payload.interface';
import { RefreshTokenRepository } from '../refresh-token.repository';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.Refresh ?? null,
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: IRefreshTokenPayload): Promise<RefreshTokenPayload> {
    const { userId, tokenId } = payload;
    const valid = await this.refreshTokenRepository.exists(userId, tokenId);
    if (!valid) {
      throw new UnauthorizedException('Refresh token is invalid or has been revoked');
    }
    return { userId, tokenId };
  }
}
