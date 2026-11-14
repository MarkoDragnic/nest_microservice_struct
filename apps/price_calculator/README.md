# Price Calculator

Consumes raw price ticks from Redis and aggregates them into one-minute OHLC candles. Completed candles are published to Kafka for the indicators service to consume and stored in MongoDB for historical access.

## OHLC aggregation

Each tick updates the in-progress one-minute candle of its symbol. A candle closes when the first tick of a later minute arrives. The service then finalises the OHLC values, publishes the completed candle to the `candle.price` Kafka topic, and persists it to MongoDB. The Kafka publish and the MongoDB write happen independently: a MongoDB failure does not block the downstream indicator pipeline.

## Horizontal scaling

Multiple instances of this service can run simultaneously, coordinated only through Redis. On startup, each instance registers itself in a Redis registry. Every 30 seconds it reads the registry and renews its own entry, which expires after 60 seconds. An instance that stops is removed from the registry once its entry has expired.

## Rebalance

An instance computes the assignment when it starts. It sorts the calculator ids and the provider ids it reads from Redis, so the outcome does not depend on which instance does the computing. A single calculator takes every provider and symbol. When there are as many calculators as providers, each calculator takes one provider with all its symbols; the starting instance writes the assignment of the others to Redis, and they resubscribe on their next heartbeat. Other combinations are not handled yet: no assignment is made, and symbols are never divided inside a provider. No locks, no leader election.
