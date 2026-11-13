# Indicators

Receives candles from the `candle.price` Kafka topic and computes technical indicators for every symbol that has an active robot watching it.

## What gets computed

The service does not compute indicators for every symbol on the exchange. Before processing a candle, it checks the indicator registry in Redis (maintained by the robots service) to find out which symbols and indicator types are actually in use. If nothing is watching a symbol, that candle is discarded immediately. This keeps compute proportional to the number of active strategies rather than the total number of available pairs.

Currently implemented indicators are RSI and High/Low. Both keep rolling state in memory, one instance per symbol, period and interval, and update incrementally on each candle: there is no full recalculation from scratch. The state is lost on a restart and seeded again from history.

## Warmup

An indicator cannot produce a valid value until enough prior candles have been seen. The first time the service meets a symbol, period and interval (after a start, or when a new one appears in the registry), it asks the history provider over TCP for a seed dataset. Once the indicator state is initialised from history, the service begins emitting results for live candles.

## Kafka output

When at least one indicator has a stable value for a candle, the service stores the candle with its indicators in MongoDB and publishes an `indicator.trigger` event to Kafka with the trading symbol as the message key. Kafka uses that key to assign the message to a consistent partition, which means events for a given symbol land on the same trader replica while the partition assignment is stable. The trader also keeps a per-symbol claim in Redis.
