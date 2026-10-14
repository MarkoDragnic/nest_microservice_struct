import { RobotCreateDto } from '@app/contracts/dto';

// userId is the authenticated user, set by gateway. user carries the same id for services not yet reading userId.
export type RobotCreateData = {
  robot: RobotCreateDto;
  user: { id?: string };
  userId: string;
};
