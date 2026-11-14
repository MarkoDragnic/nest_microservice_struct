import type { UserCredentials } from '@app/contracts/internal';
import { User } from '../models';

export const toUserCredentials = (user: User): UserCredentials => ({
  id: user.id as string,
  password: user.password,
});
