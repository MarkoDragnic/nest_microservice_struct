import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { TCP_DB_EVENTS, type UserCreateDto } from '@app/contracts';
import { LoggerService } from '@app/core';
import { PG_READ_SERVICE, PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
import { RpcException } from '@nestjs/microservices';
import bcryptjs from 'bcryptjs';

const spyOnCompare = () => jest.spyOn(bcryptjs, 'compare') as unknown as jest.Mock;
const spyOnHash = () => jest.spyOn(bcryptjs, 'hash') as unknown as jest.Mock;
const rejectionOf = (promise: Promise<unknown>): Promise<Error> =>
  promise.then(
    () => {
      throw new Error('Expected a rejection');
    },
    (error: Error) => error,
  );

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('UsersService', () => {
  let service: UsersService;

  const mockPgWriteClient = {};
  const mockPgReadClient = {};

  const mockTcpClientService = {
    send: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PG_WRITE_SERVICE, useValue: mockPgWriteClient },
        { provide: PG_READ_SERVICE, useValue: mockPgReadClient },
        { provide: ClientTcpService, useValue: mockTcpClientService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('verifyUser', () => {
    it('should return the user id only, not the credentials, when credentials are valid', async () => {
      const user = { id: '1', email: 'test@test.com', password: 'hashed' };
      mockTcpClientService.send.mockResolvedValue(user);
      spyOnCompare().mockResolvedValue(true);

      const result = await service.verifyUser('test@test.com', 'password');

      expect(result).toEqual({ id: '1' });
      expect(mockTcpClientService.send).toHaveBeenCalledWith(
        mockPgReadClient,
        TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD,
        { email: 'test@test.com' },
      );
      expect(bcryptjs.compare).toHaveBeenCalledWith('password', 'hashed');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const user = { id: '1', email: 'test@test.com', password: 'hashed' };
      mockTcpClientService.send.mockResolvedValue(user);
      spyOnCompare().mockResolvedValue(false);

      await expect(service.verifyUser('test@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should compare against the dummy hash and throw UnauthorizedException when the user is not found', async () => {
      mockTcpClientService.send.mockRejectedValue(new RpcException({ statusCode: 404, message: 'User not found' }));
      const compare = spyOnCompare().mockResolvedValue(false);

      await expect(service.verifyUser('unknown@test.com', 'password')).rejects.toThrow(UnauthorizedException);

      const dummyHash = service['dummyHash'];
      expect(bcryptjs.getRounds(dummyHash)).toBe(12);
      expect(compare).toHaveBeenCalledTimes(1);
      expect(compare).toHaveBeenCalledWith('password', dummyHash);
    });

    it('should reject a wrong password and an unknown user with the same message', async () => {
      spyOnCompare().mockResolvedValue(false);

      mockTcpClientService.send.mockResolvedValueOnce({ id: '1', password: 'hashed' });
      const wrongPassword = await rejectionOf(service.verifyUser('test@test.com', 'wrong'));

      mockTcpClientService.send.mockRejectedValueOnce(new RpcException({ statusCode: 404, message: 'User not found' }));
      const notFound = await rejectionOf(service.verifyUser('unknown@test.com', 'wrong'));

      expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
      expect(notFound).toBeInstanceOf(UnauthorizedException);
      expect(notFound.message).toBe(wrongPassword.message);
    });

    it('should rethrow a timeout as it is, without a compare', async () => {
      const timeout = new RpcException({ statusCode: 503, message: 'Service timeout' });
      mockTcpClientService.send.mockRejectedValue(timeout);
      const compare = spyOnCompare();

      await expect(service.verifyUser('test@test.com', 'password')).rejects.toBe(timeout);
      expect(compare).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should hash password and send to pg_write', async () => {
      const userDto = { email: 'new@test.com', password: 'P@ssw0rd1', notifyByEmail: true };
      const createdUser = { id: '2', ...userDto, password: 'hashed-password' };

      const hash = spyOnHash().mockResolvedValue('hashed-password');
      mockTcpClientService.send.mockResolvedValue(createdUser);

      const result = await service.create(userDto);

      expect(hash).toHaveBeenCalledWith('P@ssw0rd1', 12);
      expect(mockTcpClientService.send).toHaveBeenCalledWith(
        mockPgWriteClient,
        TCP_DB_EVENTS.USER_CREATE,
        expect.objectContaining({
          email: 'new@test.com',
          password: 'hashed-password',
          notifyByEmail: true,
          isActive: true,
        }),
      );
      expect(result).toEqual(createdUser);
    });

    it('should send pg_write a hash with bcrypt cost 12', async () => {
      mockTcpClientService.send.mockResolvedValue({});

      await service.create({ email: 'new@test.com', password: 'P@ssw0rd1', notifyByEmail: false });

      const hashSentToPgWrite: string = mockTcpClientService.send.mock.calls[0][2].password;
      expect(bcryptjs.getRounds(hashSentToPgWrite)).toBe(12);
    });

    it('should send pg_write only the fields of a new user, not roles, id or isActive from the message', async () => {
      spyOnHash().mockResolvedValue('hashed-password');
      mockTcpClientService.send.mockResolvedValue({});
      const message = {
        email: 'new@test.com',
        password: 'P@ssw0rd1',
        notifyByEmail: false,
        roles: ['admin'],
        id: 'chosen-user-id',
        isActive: false,
      } as UserCreateDto;

      await service.create(message);

      const [client, pattern, sent] = mockTcpClientService.send.mock.calls[0];
      expect(client).toBe(mockPgWriteClient);
      expect(pattern).toBe(TCP_DB_EVENTS.USER_CREATE);
      expect(JSON.parse(JSON.stringify(sent))).toEqual({
        email: 'new@test.com',
        password: 'hashed-password',
        notifyByEmail: false,
        createdAt: expect.stringMatching(ISO_TIMESTAMP),
        updatedAt: expect.stringMatching(ISO_TIMESTAMP),
        isActive: true,
      });
    });

    it('should not send plain text password to pg_write', async () => {
      const userDto = { email: 'new@test.com', password: 'P@ssw0rd1', notifyByEmail: false };
      spyOnHash().mockResolvedValue('bcrypt-hash');
      mockTcpClientService.send.mockResolvedValue({});

      await service.create(userDto);

      const sentPayload = mockTcpClientService.send.mock.calls[0][2];
      expect(sentPayload.password).toBe('bcrypt-hash');
      expect(sentPayload.password).not.toBe('P@ssw0rd1');
    });
  });

  describe('getUser', () => {
    it('should fetch user from pg_read', async () => {
      const user = { id: '1', email: 'test@test.com' };
      mockTcpClientService.send.mockResolvedValue(user);

      const result = await service.getUser({ id: '1' });

      expect(result).toEqual(user);
      expect(mockTcpClientService.send).toHaveBeenCalledWith(mockPgReadClient, TCP_DB_EVENTS.USER_FIND_ONE, {
        id: '1',
      });
    });
  });
});
