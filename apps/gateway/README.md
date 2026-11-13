# Gateway

The only public-facing service in the system. All external HTTP traffic enters here and nowhere else: in the compose files no other application service publishes a port, so the rest is reachable only inside the Docker network.

The gateway holds no state and contains no business logic. Its job is to authenticate the request, enforce rate limits, and route to the right internal service. Keeping it thin makes the boundary between the outside world and the internal cluster explicit and easy to audit.

## Auth routing

Requests to `/auth` and its subpaths are not handled locally. The gateway proxies them directly to the auth service's HTTP server using `http-proxy-middleware`. This keeps auth logic out of the gateway entirely: for these routes the gateway does not inspect cookies, sign tokens, or know anything about sessions.

## Token validation

For protected routes the gateway reads the `Authentication` cookie and forwards it to the auth service over TCP before the request reaches any controller. Auth answers with the user id only, which the gateway attaches to the request as `{ id }`. Since validation always defers to auth, there is a single source of truth: no service can accept a token that auth would reject.

## Rate limiting

Routes handled by the gateway's own controllers are throttled by NestJS Throttler: 100 requests per minute, and 10 per minute for registration (`POST /user`). Requests to `/auth` never reach that guard, because a middleware proxies them first. They pass a separate, tighter limit of 10 per minute (`express-rate-limit`) in a middleware before the proxy, since login is the most obvious target for automated abuse. Both limiters keep their counters in Redis when `REDIS_HOST` is set, and in memory otherwise. The throttler uses a raw `ioredis` instance rather than the shared `RedisService` wrapper because `ThrottlerStorageRedisService` expects that interface specifically.

## Paginated list endpoints

The gateway exposes `GET /robot` and `GET /robot/positions` for retrieving paginated data. Both require authentication and accept `page` and `limit` query parameters (defaults: page 1, limit 20, max 100). These route through to the `pg_read` service over TCP, which performs the query with `findAndCount` and returns a response with `data`, `total`, `page`, `limit`, and `totalPages`.

## API documentation

Swagger UI is available at `/api/docs` when the service is running. The robot, account, user and auth endpoints are annotated with `@ApiOperation` and `@ApiResponse`, and the ones that need a login also with `@ApiCookieAuth`.

## Correlation ID

Every request is tagged with an `X-Correlation-Id` header (either forwarded from the caller or generated as a new UUID). The id is kept in `AsyncLocalStorage`, and `ClientTcpService` adds it to every TCP message it sends. The receiving services do not read it yet and the logger does not write it, so it cannot be used today to trace a request through the logs.
