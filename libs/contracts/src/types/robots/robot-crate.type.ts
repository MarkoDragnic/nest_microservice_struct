import { RobotCreateDto } from '@app/contracts/dto';

// userId is the authenticated user, set by gateway.
export type RobotCreateData = {
  robot: RobotCreateDto;
  userId: string;
};
