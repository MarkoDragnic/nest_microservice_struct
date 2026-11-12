import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { type Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { ITokenPayload, IRefreshTokenPayload } from './interfaces/token-payload.interface';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UsersService } from './users/users.service';

const isNotFound = (error: unknown): boolean =>
  error instanceof RpcException && (error.getError() as { statusCode?: number })?.statusCode === 404;

@Injectable()
export class AuthService {
  private readonly jwtExpirationSeconds: number;
  private readonly jwtRefreshExpirationSeconds: number;
  private readonly jwtRefreshSecret: string;
  private readonly secureCookies: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly usersService: UsersService,
  ) {
    this.jwtExpirationSeconds = this.configService.getOrThrow<number>('JWT_EXPIRATION');
    this.jwtRefreshExpirationSeconds = this.configService.getOrThrow<number>('JWT_REFRESH_EXPIRATION');
    this.jwtRefreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.secureCookies = this.configService.getOrThrow<string>('NODE_ENV') === 'production';
  }

  async login(user: { id: string }, response: Response) {
    await this.issueTokens(user.id, response);
  }

  async refresh(userId: string, oldTokenId: string, response: Response) {
    if (!(await this.isActive(userId))) {
      throw new UnauthorizedException('Refresh token is invalid or has been revoked');
    }
    await this.refreshTokenRepository.delete(userId, oldTokenId);
    await this.issueTokens(userId, response);
  }

  async logout(userId: string, tokenId: string, response: Response) {
    await this.refreshTokenRepository.delete(userId, tokenId);
    this.clearCookies(response);
  }

  private async isActive(userId: string): Promise<boolean> {
    try {
      const user = await this.usersService.getUser({ id: userId });
      return user?.isActive === true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  private async issueTokens(userId: string, response: Response): Promise<void> {
    const tokenId = randomUUID();

    const accessPayload: ITokenPayload = { userId };
    const refreshPayload: IRefreshTokenPayload = { userId, tokenId };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpirationSeconds,
    });

    await this.refreshTokenRepository.save(userId, tokenId);

    const accessExpires = new Date();
    accessExpires.setSeconds(accessExpires.getSeconds() + this.jwtExpirationSeconds);

    const refreshExpires = new Date();
    refreshExpires.setSeconds(refreshExpires.getSeconds() + this.jwtRefreshExpirationSeconds);

    response.cookie('Authentication', accessToken, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'strict',
      expires: accessExpires,
    });

    response.cookie('Refresh', refreshToken, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'strict',
      expires: refreshExpires,
      path: '/auth',
    });
  }

  private clearCookies(response: Response): void {
    response.clearCookie('Authentication', {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'strict',
    });
    response.clearCookie('Refresh', {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'strict',
      path: '/auth',
    });
  }
}

