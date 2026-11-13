# Security Policy

## Scope

This is a **portfolio / demonstration project**. It is not a maintained production library or service. No SLA, no guaranteed patch timeline.

That said, the codebase intentionally demonstrates security-conscious patterns (AES-256-GCM credential encryption, JWT refresh-token rotation, internal RPC token validation, rate limiting, IP allow-listing). Reports that point out genuine mistakes in those patterns are welcomed and will be addressed.

## ⚠️ Do not use real credentials with this repository

The platform connects to Binance and Gmail. Before running it, read this:

| Credential type | Recommendation |
|---|---|
| Binance API keys | Use **Binance Testnet** only (`BINANCE_TEST_URL`). Never paste live trading keys. |
| Google OAuth tokens | Use a **dedicated test Gmail account**, not your personal or work account. |
| `ENCRYPTION_CREDENTIAL_KEY` | Generate a fresh 64-char hex key (`openssl rand -hex 32`). Do not reuse keys across environments. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Generate fresh random values of at least 32 characters per environment. |
| `INTERNAL_RPC_TOKEN` | Set a strong, unique value per deployment. The default placeholder must be replaced. |

## Supported versions

Only the latest commit on the default branch is considered. There are no versioned releases.

## Reporting a vulnerability

If you find a security issue in this repository:

1. **Do not open a public GitHub issue.**
2. Use [GitHub's private vulnerability reporting](https://github.com/MarkoDragnic/nest_microservice_struct/security/advisories/new) for this repository.
3. Alternatively, email **dragnicmarko86@gmail.com** with the subject line `[SECURITY] nest_microservice_struct`.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept (no live exploits against real systems please)
- Any suggested remediation if you have one

You can expect an acknowledgement within **7 days** and a best-effort resolution within **30 days** given the portfolio nature of the project.

## Security design notes

The following security controls are intentionally implemented and can serve as reference points:

- **Credential encryption**: Exchange API keys are stored encrypted with AES-256-GCM (`accounts` service). The encryption key never leaves the service environment.
- **JWT rotation**: Short-lived access tokens (15 min) paired with long-lived refresh tokens. The id of each refresh token is stored in Redis. Refresh tokens are invalidated on use and on logout.
- **Internal RPC token**: Inter-service TCP calls carry a shared `INTERNAL_RPC_TOKEN` as a field of the message. A NestJS guard (`InternalRpcGuard`) compares it in constant time. The two TCP handlers of `price_provider` do not use the guard.
- **One public application port**: In the compose files only the API Gateway publishes an application port (4040). `docker-compose.full.yml` also publishes Prometheus (9090) and Grafana (3001). All other services are reachable only within the Docker network.
- **Rate limiting**: Gateway routes are rate-limited via `@nestjs/throttler`, and requests to `/auth` via `express-rate-limit` before they are proxied. Both use Redis-backed storage when `REDIS_HOST` is set, to work correctly across gateway replicas.
- **Input validation**: HTTP request bodies and query parameters at the gateway are validated with `class-validator` DTOs. `ValidationPipe` is applied globally with `whitelist: true` (unknown properties are stripped). It does not reach the TCP handlers, so payloads between services are not validated (see Known gaps in `README.md`).
