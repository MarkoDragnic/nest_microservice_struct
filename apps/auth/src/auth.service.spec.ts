import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UsersService } from './users/users.service';
import { type Response } from 'express';

const expectRefusedLikeARevokedToken = async (refresh: Promise<void>) => {
  const error = await refresh.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(UnauthorizedException);
  expect((error as UnauthorizedException).getResponse()).toEqual(
    new UnauthorizedException('Refresh token is invalid or has been revoked').getResponse(),
  );
};

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let refreshTokenRepository: RefreshTokenRepository;
  let mockResponse: Partial<Response>;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_EXPIRATION: 3600,
        JWT_REFRESH_EXPIRATION: 604800,
        JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed-token'),
  };

  const mockRefreshTokenRepository = {
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
  };

  const mockUsersService = {
    getUser: jest.fn(),
  };

  beforeEach(async () => {
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepository },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenRepository = module.get<RefreshTokenRepository>(RefreshTokenRepository);

    jest.clearAllMocks();
    mockUsersService.getUser.mockReset();
  });

  describe('login', () => {
    it('should issue tokens and set cookies', async () => {
      await service.login({ id: 'user-123' }, mockResponse as Response);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);

      // Access token signed with default options
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
      );

      // Refresh token signed with refresh secret
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123', tokenId: expect.any(String) }),
        expect.objectContaining({ secret: 'test-refresh-secret-that-is-long-enough', expiresIn: 604800 }),
      );

      expect(refreshTokenRepository.save).toHaveBeenCalledWith('user-123', expect.any(String));

      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);

      // Access cookie
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'Authentication',
        'signed-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        }),
      );

      // Refresh cookie scoped to /auth
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'Refresh',
        'signed-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/auth',
        }),
      );
    });

    it('should not set secure cookies in non-production', async () => {
      await service.login({ id: 'user-123' }, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'Authentication',
        expect.any(String),
        expect.objectContaining({ secure: false }),
      );
    });
  });

  describe('refresh', () => {
    const expectNothingIssued = () => {
      expect(refreshTokenRepository.delete).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    };

    it('should delete old token and issue new pair', async () => {
      mockUsersService.getUser.mockResolvedValueOnce({ id: 'user-123', isActive: true });

      await service.refresh('user-123', 'old-token-id', mockResponse as Response);

      expect(mockUsersService.getUser).toHaveBeenCalledWith({ id: 'user-123' });
      expect(refreshTokenRepository.delete).toHaveBeenCalledWith('user-123', 'old-token-id');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith('user-123', expect.any(String));
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
    });

    it.each([false, undefined, 'true'])(
      'should refuse a user whose isActive is %p, the same as a revoked token',
      async (isActive) => {
        mockUsersService.getUser.mockResolvedValueOnce({ id: 'user-123', isActive });

        await expectRefusedLikeARevokedToken(service.refresh('user-123', 'old-token-id', mockResponse as Response));
        expectNothingIssued();
      },
    );

    it('should refuse a user that does not exist, the same as a revoked token', async () => {
      mockUsersService.getUser.mockRejectedValueOnce(
        new RpcException({ statusCode: 404, message: 'Entity not found.', error: true }),
      );

      await expectRefusedLikeARevokedToken(service.refresh('user-123', 'old-token-id', mockResponse as Response));
      expectNothingIssued();
    });

    it.each([
      ['a timeout', new RpcException({ statusCode: 503, message: 'Service timeout on user.db.find-one', error: true })],
      ['a server error', new RpcException({ statusCode: 500, message: 'Something went wrong', error: true })],
      ['an error without a status', new Error('connect ECONNREFUSED')],
    ])('should pass on %s of pg_read as it is', async (_name, failure) => {
      mockUsersService.getUser.mockRejectedValueOnce(failure);

      await expect(service.refresh('user-123', 'old-token-id', mockResponse as Response)).rejects.toBe(failure);
      expectNothingIssued();
    });
  });

  describe('logout', () => {
    it('should delete token and clear cookies', async () => {
      await service.logout('user-123', 'token-id', mockResponse as Response);

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith('user-123', 'token-id');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'Authentication',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'Refresh',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/auth' }),
      );
    });
  });
});
