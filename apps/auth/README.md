# Auth

Handles user registration, login, token refresh, logout, and internal token verification.

The service runs two transports simultaneously: an HTTP server for login, refresh and logout, reachable via the gateway, and a TCP microservice. Over TCP it accepts `AUTHENTICATE` messages, which the gateway sends to verify an access token, and `USER_CREATE` messages for registration. This separation keeps the internal verification path off the public network.

Auth does not touch the database directly. All user lookups and writes go through `pg_read` and `pg_write` over TCP, keeping the data access pattern consistent with the rest of the system.

## Token strategy

Login issues two separate httpOnly cookies. Neither is accessible to client-side JavaScript:

- **`Authentication`**: short-lived access token (15 minutes), signed with `JWT_SECRET`. This is what every protected route validates.
- **`Refresh`**: long-lived token (7 days), signed with a separate `JWT_REFRESH_SECRET` and scoped to `path: /auth` so it is only sent to auth endpoints. It contains a `tokenId` (UUID) alongside the user ID.

The two lifetimes come from `JWT_EXPIRATION` and `JWT_REFRESH_EXPIRATION`. The values above are the ones in `.env.example`.

On login, the `tokenId` is stored in Redis with the lifetime of the refresh token as TTL. A refresh token is only accepted if its `tokenId` still exists in Redis. This is what makes revocation possible.

## Refresh token rotation

`POST /auth/refresh` requires the `Refresh` cookie. The service verifies the JWT signature, checks the `tokenId` in Redis and checks that the user is still active. If all hold, it **deletes the old tokenId and issues a completely new token pair**. The old refresh token is dead immediately after use. If a stolen token is presented after the legitimate user has already refreshed, Redis returns nothing and the request gets a 401.

## Logout

`POST /auth/logout` also requires the `Refresh` cookie. It deletes the `tokenId` from Redis and clears both cookies. The refresh token is revoked immediately regardless of its remaining expiry time.

The access token has no server-side state and cannot be revoked. It simply expires after 15 minutes. This is an accepted tradeoff: keeping the access token stateless means no Redis lookup on every protected request, while the refresh token handles long-term session control. Each verification does read the user through `pg_read`, so an access token of a deactivated user is refused before it expires.
