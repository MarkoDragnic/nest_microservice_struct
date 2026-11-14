import { Test, TestingModule } from '@nestjs/testing';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { TCP_DB_EVENTS } from '@app/contracts';
import { InternalRpcGuard, SerializerService, LoggerService } from '@app/core';
import { User } from '@app/postgres';
import { ReadUserController } from './read-user.controller';
import { ReadUserService } from './read-user.service';

const PASSWORD_HASH = '$2b$16$3euPcmQFCiblsZeEu5s7p.9OVHgeHWFDk9nhMqZ0m/3pd/lhwZgES';

// The worst case for every handler: the user comes back from the database with the hash loaded.
const storedUser = () =>
  Object.assign(new User(), {
    id: 'user-1',
    email: 'user@example.com',
    password: PASSWORD_HASH,
    roles: ['user'],
    notifyByEmail: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    isActive: true,
  });

// The login check needs the hash to compare a password against, so this is the only pattern that may answer with it.
const PATTERNS_ANSWERING_WITH_THE_HASH: string[] = [TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD];

type Handler = (payload: unknown) => Promise<unknown>;

// Every @MessagePattern handler of the controller, read from the metadata Nest registers it by,
// so a handler added later is checked without anyone listing it here.
const messageHandlers = (controller: { prototype: object }): [pattern: string, method: string][] =>
  Object.getOwnPropertyNames(controller.prototype).flatMap((method) => {
    const patterns: string[] | undefined = Reflect.getMetadata(PATTERN_METADATA, controller.prototype[method]);
    return (patterns ?? []).map((pattern): [string, string] => [pattern, method]);
  });

// Every method of the service answers with the stored user, whichever one a handler calls.
const serviceAnsweringWith = (service: { prototype: object }, answer: () => unknown) =>
  Object.fromEntries(
    Object.getOwnPropertyNames(service.prototype)
      .filter((method) => method !== 'constructor')
      .map((method) => [method, jest.fn(() => Promise.resolve(answer()))]),
  );

describe('ReadUserController', () => {
  let controller: ReadUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadUserController],
      providers: [
        { provide: ReadUserService, useValue: serviceAnsweringWith(ReadUserService, storedUser) },
        SerializerService,
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReadUserController>(ReadUserController);
  });

  const handlersWithoutTheHash = messageHandlers(ReadUserController).filter(
    ([pattern]) => !PATTERNS_ANSWERING_WITH_THE_HASH.includes(pattern),
  );

  it.each(handlersWithoutTheHash)('answers %s without the password hash', async (_pattern, method) => {
    const handler = (controller as unknown as Record<string, Handler>)[method].bind(controller);

    const onTheWire = JSON.stringify(await handler({ id: 'user-1', email: 'user@example.com' }));

    expect(onTheWire).toContain('user-1');
    expect(onTheWire).not.toContain(PASSWORD_HASH);
    expect(onTheWire).not.toContain('password');
  });

  it('answers the login credentials pattern with the id and the password hash, and nothing else', async () => {
    const response = await controller.findOneWithPassword({ email: 'user@example.com' });

    expect(response.data).toEqual({ id: 'user-1', password: PASSWORD_HASH });
    expect(Object.keys(response.data).sort()).toEqual(['id', 'password']);
  });

  it('answers a user read with the message User found', async () => {
    const response = await controller.findOne({ id: 'user-1' });

    expect(response.message).toBe('User found');
  });

  it('answers the login credentials pattern with the message User found', async () => {
    const response = await controller.findOneWithPassword({ email: 'user@example.com' });

    expect(response.message).toBe('User found');
  });
});
