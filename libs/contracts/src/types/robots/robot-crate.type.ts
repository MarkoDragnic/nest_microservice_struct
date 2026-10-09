import { RobotCreateDto } from '@app/contracts/dto';

export type RobotCreateData = {
  robot: RobotCreateDto;
  user: { id?: string };
};
