import { loadedUser } from './fixtures';
import { toUserCredentials } from './user-credentials.mapper';

describe('toUserCredentials', () => {
  it('maps the id and the password hash', () => {
    expect(toUserCredentials(loadedUser())).toEqual({ id: 'user-1', password: 'owner-password-hash' });
  });

  it('lets no field outside the contract through', () => {
    const credentials = toUserCredentials(loadedUser());

    expect(Object.keys(credentials).sort()).toEqual(['id', 'password']);

    const sent = JSON.stringify(credentials);
    expect(sent).not.toContain('owner@example.com');
    expect(sent).not.toContain('roles');
    expect(sent).not.toContain('notifyByEmail');
    expect(sent).not.toContain('isActive');
    expect(sent).not.toContain('2026-01-0');
  });
});
