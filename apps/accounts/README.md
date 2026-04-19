# Accounts

Manages exchange accounts — the credentials a user provides so the trader can place orders on their behalf.

The service is intentionally narrow in scope. It does not know anything about trading. Its only jobs are to protect credentials at rest and hand them back to authorised internal services on request.

## Credential storage

API keys and secrets are never stored in plain text. Before persisting, the service encrypts each value independently using AES-256-GCM with a key loaded from the environment. The result is ciphertext plus an authentication tag stored together in the database. If the database is ever compromised, the raw rows are useless without the encryption key.

## Decryption on demand

The trader calls `ACCOUNT_DECRYPT` over TCP when it needs to place an order. The service decrypts the credentials in memory, returns them in the TCP response, and holds onto nothing. Credentials exist in plaintext only for the duration of that single request — they are never written to a log, never held in a cache, and never accessible over the public network.
