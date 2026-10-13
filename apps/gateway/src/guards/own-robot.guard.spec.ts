import { ExecutionContext, HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { TCP_EVENTS } from '@app/contracts';
import { ClientTcpService, ROBOTS_SERVICE } from '@app/messaging';
import { OwnRobotGuard } from './own-robot.guard';

describe('OwnRobotGuard', () => {
  const ROBOT_ID = '7b0e5a52-6c1d-4f0e-9d53-0c1b8f6a2e11';
  const OTHER_ROBOT_ID = '0c7d2f6e-2a51-4b7e-8d0a-5e9f3c1b4a22';

  const robotsClient = { name: 'robots client' };
  const tcpClientService = { send: jest.fn() };
  let guard: OwnRobotGuard;

  beforeEach(async () => {
    tcpClientService.send.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OwnRobotGuard,
        { provide: ROBOTS_SERVICE, useValue: robotsClient },
        { provide: ClientTcpService, useValue: tcpClientService },
      ],
    }).compile();

    guard = moduleRef.get(OwnRobotGuard);
  });

  // What ClientTcpService throws when the robots service answers with an error.
  const serviceError = (statusCode: number, message: string) =>
    new RpcException({ statusCode, message, error: true, event: TCP_EVENTS.ROBOT_GET_OWNER });

  // Runs the guard for a request of user-1, unless the request says otherwise.
  const check = async (request: { body?: unknown; params?: unknown; user?: unknown }) => {
    const http = { user: { id: 'user-1' }, body: {}, params: {}, ...request };
    const context = { switchToHttp: () => ({ getRequest: () => http }) } as unknown as ExecutionContext;

    return guard.canActivate(context);
  };

  // The HTTP answer a refusal turns into.
  const refusal = async (attempt: Promise<unknown>) => {
    const error = await attempt.then(
      () => {
        throw new Error('the guard let the request through');
      },
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(HttpException);
    return { status: (error as HttpException).getStatus(), body: (error as HttpException).getResponse() };
  };

  it('lets the owner of the robot through, after asking robots who owns it', async () => {
    tcpClientService.send.mockResolvedValue({ owner: 'user-1' });

    await expect(check({ body: { robotId: ROBOT_ID } })).resolves.toBe(true);

    expect(tcpClientService.send).toHaveBeenCalledTimes(1);
    expect(tcpClientService.send).toHaveBeenCalledWith(robotsClient, TCP_EVENTS.ROBOT_GET_OWNER, { robot: ROBOT_ID });
  });

  it('answers 404 Robot not found for a robot of another user', async () => {
    tcpClientService.send.mockResolvedValue({ owner: 'user-2' });

    const answer = await refusal(check({ body: { robotId: ROBOT_ID } }));

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ message: 'Robot not found' });
  });

  it('answers 404 Robot not found for a robot that does not exist', async () => {
    tcpClientService.send.mockRejectedValue(serviceError(404, 'Entity not found.'));

    const answer = await refusal(check({ body: { robotId: ROBOT_ID } }));

    expect(answer.status).toBe(404);
    expect(answer.body).toMatchObject({ message: 'Robot not found' });
  });

  it('gives a robot of another user and a robot that does not exist the very same answer', async () => {
    tcpClientService.send.mockResolvedValueOnce({ owner: 'user-2' });
    const foreign = await refusal(check({ body: { robotId: ROBOT_ID } }));

    tcpClientService.send.mockRejectedValueOnce(serviceError(404, 'Entity not found.'));
    const missing = await refusal(check({ body: { robotId: ROBOT_ID } }));

    expect(foreign).toEqual(missing);
  });

  it('answers 404 when the robots service names no owner', async () => {
    tcpClientService.send.mockResolvedValue({});

    expect((await refusal(check({ body: { robotId: ROBOT_ID } }))).status).toBe(404);
  });

  it.each([
    ['text that is not a UUID', 'not-a-uuid'],
    ['an empty string', ''],
    ['a number', 42],
    ['an object', { id: ROBOT_ID }],
    ['a list', [ROBOT_ID]],
    ['a UUID with something after it', `${ROBOT_ID}' OR '1'='1`],
    ['nothing at all', undefined],
  ])('answers 400 for a robot id that is %s, and asks no service', async (_case, robotId) => {
    tcpClientService.send.mockResolvedValue({ owner: 'user-1' });

    const answer = await refusal(check({ body: { robotId } }));

    expect(answer.status).toBe(400);
    expect(answer.body).toMatchObject({ message: 'robotId must be a UUID' });
    expect(tcpClientService.send).not.toHaveBeenCalled();
  });

  it.each([
    ['a timeout', serviceError(503, 'Service timeout on robot.get-owner')],
    ['a failure', serviceError(500, 'Something went wrong')],
    ['an error that is no service answer', new Error('socket closed')],
  ])('passes %s of the robots service on as it is, not as a missing robot', async (_case, error) => {
    tcpClientService.send.mockRejectedValue(error);

    await expect(check({ body: { robotId: ROBOT_ID } })).rejects.toBe(error);
  });

  it.each([
    ['robotId in the route', { robotId: ROBOT_ID }],
    ['id in the route', { id: ROBOT_ID }],
  ])('takes the robot id from %s when the body has none', async (_case, params) => {
    tcpClientService.send.mockResolvedValue({ owner: 'user-1' });

    await expect(check({ params })).resolves.toBe(true);

    expect(tcpClientService.send).toHaveBeenCalledWith(robotsClient, TCP_EVENTS.ROBOT_GET_OWNER, { robot: ROBOT_ID });
  });

  it('takes the robot id from the body before the route', async () => {
    tcpClientService.send.mockResolvedValue({ owner: 'user-1' });

    await check({ body: { robotId: ROBOT_ID }, params: { robotId: OTHER_ROBOT_ID } });

    expect(tcpClientService.send).toHaveBeenCalledWith(robotsClient, TCP_EVENTS.ROBOT_GET_OWNER, { robot: ROBOT_ID });
  });

  it('refuses a request with no authenticated user, and asks no service', async () => {
    await expect(check({ user: undefined, body: { robotId: ROBOT_ID } })).resolves.toBe(false);

    expect(tcpClientService.send).not.toHaveBeenCalled();
  });
});
