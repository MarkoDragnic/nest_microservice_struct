# Gateway

The only public-facing service in the system. All external HTTP traffic enters here and nowhere else — every other service runs TCP only and is invisible outside the Docker network.

The gateway holds no state and contains no business logic. Its job is to authenticate the request, enforce rate limits, and route to the right internal service. Keeping it thin makes the boundary between the outside world and the internal cluster explicit and easy to audit.

## Auth routing

Requests to `/auth` and its subpaths are not handled locally. The gateway proxies them directly to the auth service's HTTP server using `http-proxy-middleware`. This keeps auth logic out of the gateway entirely — the gateway does not inspect cookies, sign tokens, or know anything about sessions.

## Token validation

For protected routes the gateway reads the `Authentication` cookie and forwards it to the auth service over TCP before the request reaches any controller. Auth replies with the decoded user payload, which the gateway attaches to the request context. Since validation always defers to auth, there is a single source of truth — no service can accept a token that auth would reject.

## Rate limiting

All routes are subject to a Redis-backed throttle via NestJS Throttler. The auth endpoints carry an additional tighter limit applied as a middleware layer before proxy forwarding, since registration and login are the most obvious targets for automated abuse. The throttler uses a raw `ioredis` instance rather than the shared `RedisService` wrapper because `ThrottlerStorageRedisService` expects that interface specifically.

## Paginated list endpoints

The gateway exposes `GET /robot` and `GET /robot/positions` for retrieving paginated data. Both require authentication and accept `page` and `limit` query parameters (defaults: page 1, limit 20, max 100). These route through to the `pg_read` service over TCP, which performs the query with `findAndCount` and returns a response with `data`, `total`, `page`, `limit`, and `totalPages`.

## API documentation

Swagger UI is available at `/api/docs` when the service is running. All endpoints are annotated with `@ApiOperation`, `@ApiResponse`, and `@ApiCookieAuth` decorators.

## Correlation ID

Every request is tagged with an `X-Correlation-Id` header (either forwarded from the caller or generated as a new UUID). This ID is propagated through TCP calls to downstream services via `AsyncLocalStorage`, making it possible to trace a single request across all services in the logs.
