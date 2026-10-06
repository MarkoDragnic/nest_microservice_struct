import type { PositionRobot, RobotNotificationTarget } from '@app/contracts/internal';
import { Position, Robot } from '../models';

export const toRobotNotificationTarget = (robot: Robot): RobotNotificationTarget => ({
  name: robot.name,
  owner: {
    email: robot.owner.email,
    notifyByEmail: robot.owner.notifyByEmail,
  },
});

export const toPositionRobot = (position: Position): PositionRobot => ({
  robot: toRobotNotificationTarget(position.robot),
});
