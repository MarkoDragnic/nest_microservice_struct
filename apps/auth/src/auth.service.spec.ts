import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenRepository } from './refresh-token.repository';
import { type Response } from 'express';

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenRepository = module.get<RefreshTokenRepository>(RefreshTokenRepository);

    jest.clearAllMocks();
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
    it('should delete old token and issue new pair', async () => {
      await service.refresh('user-123', 'old-token-id', mockResponse as Response);

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith('user-123', 'old-token-id');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith('user-123', expect.any(String));
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
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
