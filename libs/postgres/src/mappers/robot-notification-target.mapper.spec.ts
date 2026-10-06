import { loadedPosition, loadedRobot } from './fixtures';
import { toPositionRobot, toRobotNotificationTarget } from './robot-notification-target.mapper';

const expectNoSecrets = (value: unknown) => {
  const sent = JSON.stringify(value);
  expect(sent).not.toContain('owner-password-hash');
  expect(sent).not.toContain('api-key');
  expect(sent).not.toContain('api-secret');
  expect(sent).not.toContain('robot-hash');
};

describe('toRobotNotificationTarget', () => {
  it('maps the robot name and the owner contact fields', () => {
    expect(toRobotNotificationTarget(loadedRobot())).toEqual({
      name: 'Robot one',
      owner: { email: 'owner@example.com', notifyByEmail: true },
    });
  });

  it('lets no field outside the contract through', () => {
    const target = toRobotNotificationTarget(loadedRobot());

    expect(Object.keys(target).sort()).toEqual(['name', 'owner']);
    expect(Object.keys(target.owner).sort()).toEqual(['email', 'notifyByEmail']);
    expectNoSecrets(target);
  });
});

describe('toPositionRobot', () => {
  it('maps a position to the notification target of its robot', () => {
    expect(toPositionRobot(loadedPosition())).toEqual({
      robot: { name: 'Robot one', owner: { email: 'owner@example.com', notifyByEmail: true } },
    });
  });

  it('lets no field outside the contract through', () => {
    const positionRobot = toPositionRobot(loadedPosition());

    expect(Object.keys(positionRobot)).toEqual(['robot']);
    expect(Object.keys(positionRobot.robot).sort()).toEqual(['name', 'owner']);
    expect(Object.keys(positionRobot.robot.owner).sort()).toEqual(['email', 'notifyByEmail']);
    expectNoSecrets(positionRobot);
  });
});
