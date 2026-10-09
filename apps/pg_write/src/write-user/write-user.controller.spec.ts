import { Test, TestingModule } from '@nestjs/testing';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { InternalRpcGuard, LoggerService, SerializerService } from '@app/core';
import { User } from '@app/postgres';
import { WriteUserController } from './write-user.controller';
import { WriteUserService } from './write-user.service';

const PASSWORD_HASH = '$2b$16$3euPcmQFCiblsZeEu5s7p.9OVHgeHWFDk9nhMqZ0m/3pd/lhwZgES';

// What the repository hands back after a save: the entity, still carrying the hash it was saved with.
const savedUser = () =>
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

type Handler = (payload: unknown) => Promise<unknown>;

// Every @MessagePattern handler of the controller, read from the metadata Nest registers it by,
// so a handler added later is checked without anyone listing it here.
const messageHandlers = (controller: { prototype: object }): [pattern: string, method: string][] =>
  Object.getOwnPropertyNames(controller.prototype).flatMap((method) => {
    const patterns: string[] | undefined = Reflect.getMetadata(PATTERN_METADATA, controller.prototype[method]);
    return (patterns ?? []).map((pattern): [string, string] => [pattern, method]);
  });

// Every method of the service answers with the saved user, whichever one a handler calls.
const serviceAnsweringWith = (service: { prototype: object }, answer: () => unknown) =>
  Object.fromEntries(
    Object.getOwnPropertyNames(service.prototype)
      .filter((method) => method !== 'constructor')
      .map((method) => [method, jest.fn(() => Promise.resolve(answer()))]),
  );

describe('WriteUserController', () => {
  let controller: WriteUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WriteUserController],
      providers: [
        { provide: WriteUserService, useValue: serviceAnsweringWith(WriteUserService, savedUser) },
        SerializerService,
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
      ],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WriteUserController>(WriteUserController);
  });

  it('answers user-create with the public user fields, not the entity', async () => {
    const response = await controller.create({
      email: 'user@example.com',
      password: PASSWORD_HASH,
      notifyByEmail: true,
    } as User);

    expect(response.data).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      roles: ['user'],
      notifyByEmail: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      isActive: true,
    });
    expect(Object.keys(response.data).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'isActive',
      'notifyByEmail',
      'roles',
      'updatedAt',
    ]);
  });

  it.each(messageHandlers(WriteUserController))('answers %s without the password hash', async (_pattern, method) => {
    const handler = (controller as unknown as Record<string, Handler>)[method].bind(controller);

    const onTheWire = JSON.stringify(await handler({ id: 'user-1', email: 'user@example.com' }));

    expect(onTheWire).toContain('user-1');
    expect(onTheWire).not.toContain(PASSWORD_HASH);
    expect(onTheWire).not.toContain('password');
  });
});
