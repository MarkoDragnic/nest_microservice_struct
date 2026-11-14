# Accounts

Manages exchange accounts: the credentials a user provides so the trader can place orders on their behalf.

The service is intentionally narrow in scope. It does not know anything about trading. Its only jobs are to protect credentials at rest and hand them back to authorised internal services on request.

## Credential storage

API keys and secrets are never stored in plain text. Before the account is sent to `pg_write` for storage, the service encrypts each value independently using AES-256-GCM with a key loaded from the environment. The result is an IV, the ciphertext and an authentication tag, stored together in the database. If the database is ever compromised, the raw rows are useless without the encryption key.

## Decryption on demand

The trader reads the encrypted values with the robot from `pg_read`. When it needs to place an order it sends each value in an `ACCOUNT_DECRYPT` call over TCP, one call for the key and one for the secret. The service decrypts the value in memory, returns it in the TCP response, and holds onto nothing. This service does not write the plaintext to a log or hold it in a cache, and it publishes no port outside the Docker network.
