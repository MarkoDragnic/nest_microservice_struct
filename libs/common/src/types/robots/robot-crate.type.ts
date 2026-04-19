import { RobotCreateDto } from '@app/common/dto';
import { User } from '@app/common/models';

export type RobotCreateData = {
  robot: RobotCreateDto;
  user: User;
};
