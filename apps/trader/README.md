# Trader

The execution engine. This is the most complex service in the system.

## Kafka consumer design

The trader consumes from the `indicator.trigger` topic, which the indicators service publishes at most once per completed candle per symbol. The critical detail is that the topic is keyed by symbol: the message key is the trading pair. All events for a given symbol land on the same partition and are processed by the same trader replica while the partition assignment is stable. On top of that the trader keeps a per-symbol claim in Redis (`SYMBOL_CLAIM_TTL_MS`, 30 seconds by default), and a replica only processes a symbol it holds the claim for. Triggers older than `TICKER_MAX_AGE_MS` (30 seconds by default) are dropped. Scaling out is adding replicas to the consumer group and letting Kafka rebalance the partition assignments.

## Evaluation order

When a trigger arrives, the trader fetches all active robots for that symbol and then their open positions, in two reads from `pg_read`. A robot with an open position is checked for exit only: take-profit and stop-loss first, then the indicator-based close rules. It is not checked for entry on that candle, whether or not the position closes. Only a robot without an open position is checked for entry. This ordering prevents a scenario where an exit and entry condition both fire on the same candle and the service opens a new position while it still holds one.

Closing or opening a position means calling the Binance API to place the order, then calling the positions service over TCP to record the trade. For an account with environment `test` no order is sent and only the position is recorded. The transactional write happens in `pg_write`, behind the positions service. The trader waits for the answer.

## Credentials

The robot read from `pg_read` carries the encrypted exchange API credentials of its account. At the moment of execution the trader sends them to the accounts service over TCP to be decrypted, uses the plaintext for the single Binance API call, and discards it. The trader never holds credentials in a cache or writes them to a log. Both Binance testnet and production are supported, determined by the environment of the account attached to each robot: `sandbox` uses `BINANCE_TEST_URL`, `production` uses `BINANCE_PROD_URL`.
