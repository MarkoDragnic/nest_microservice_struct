import type { ManagedRobot } from '@app/contracts/internal';
import { Robot } from '../models';

export const toManagedRobot = (robot: Robot): ManagedRobot => ({
  fsymbol: robot.fsymbol,
  indicators: robot.indicators,
  owner: { id: robot.owner.id as string },
});
