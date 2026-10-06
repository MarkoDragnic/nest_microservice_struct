// Who to notify about a robot's positions, and under which robot name.
export interface RobotNotificationTarget {
  name: string;
  owner: {
    email: string;
    notifyByEmail: boolean;
  };
}

// pg_read's find-position answer: positions only needs the robot behind the position.
export interface PositionRobot {
  robot: RobotNotificationTarget;
}
