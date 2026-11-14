// What pg_read answers for a login check. password is the bcrypt hash; nothing else of the user travels.
export interface UserCredentials {
  id: string;
  password: string;
}
