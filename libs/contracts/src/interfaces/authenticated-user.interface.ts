// What auth answers when an access token authenticates, and what gateway holds as the current user.
// Only the id: nothing behind gateway reads more.
export interface AuthenticatedUser {
  id: string;
}
