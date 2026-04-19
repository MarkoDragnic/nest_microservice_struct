# Trader

The execution engine. This is the most complex service in the system.

## Kafka consumer design

The trader consumes from the `indicator.trigger` topic, which the indicators service publishes once per completed candle per symbol. The critical detail is that the topic is partitioned by symbol — the message key is the trading pair. All events for a given symbol always land on the same partition and are always processed by the same trader replica. This gives the trader single-threaded processing per symbol without any distributed locking or coordination. Scaling out is simply adding replicas to the consumer group and letting Kafka rebalance the partition assignments.

## Evaluation order

When a trigger arrives, the trader fetches all active robots for that symbol and all their open positions in a single batch read from `pg_read`. Exit conditions are evaluated before entry conditions, always. If a take-profit, stop-loss, or indicator-based close rule fires, the position is closed first and the entry check is skipped for that robot. This ordering prevents a scenario where an exit and entry condition both fire on the same candle and the service opens a new position it should have already closed.

Closing or opening a position means calling the Binance API to place the order, then notifying the positions service over TCP to record the trade atomically. The positions service handles the transactional write — the trader just fires the event and moves on.

## Credentials

Exchange API credentials are fetched from the accounts service over TCP at the moment of execution, decrypted in memory, used for the single Binance API call, and discarded. The trader never holds credentials in a cache or writes them to a log. The accounts service controls access — the trader just asks and receives what it needs for that one operation. Both Binance testnet and production are supported, determined by the account configuration attached to each robot.
