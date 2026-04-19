# Price Calculator

Consumes raw price ticks from Redis and aggregates them into OHLC candles at multiple timeframes (1m, 5m, 15m, 1h). Completed candles are published to Kafka for the indicators service to consume and stored in MongoDB for historical access.

## OHLC aggregation

Each tick updates the in-progress candle for every configured timeframe. When a candle period closes, the service finalises the OHLC values, publishes the completed candle to the `candle.price` Kafka topic, and persists it to MongoDB. The Kafka publish and the MongoDB write happen independently — a MongoDB failure does not block the downstream indicator pipeline.

## Horizontal scaling

Multiple instances of this service can run simultaneously without any external coordinator. On startup, each instance registers itself in a Redis registry and begins sending a heartbeat every 30 seconds. If an instance stops heartbeating, the others detect the absence and trigger a rebalance.

## Rebalance

When the set of live instances changes — an instance joins, crashes, or is scaled down — every active instance runs the same deterministic partitioning algorithm against the shared Redis state. The active symbols are divided evenly, and each instance subscribes to its assigned slice. Because the algorithm is deterministic and all instances read the same state, the outcome is identical regardless of which instance triggers the rebalance first. No locks, no leader election.
