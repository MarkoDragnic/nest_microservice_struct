# Indicators

Receives candles from the `candle.price` Kafka topic and computes technical indicators for every symbol that has an active robot watching it.

## What gets computed

The service does not compute indicators for every symbol on the exchange. Before processing a candle, it checks the indicator registry in Redis — maintained by the robots service — to find out which symbols and indicator types are actually in use. If nothing is watching a symbol, that candle is discarded immediately. This keeps compute proportional to the number of active strategies rather than the total number of available pairs.

Currently implemented indicators are RSI and High/Low. Both maintain rolling state in MongoDB and update incrementally on each candle — there is no full recalculation from scratch.

## Warmup

Indicators that require historical context — RSI in particular — cannot produce a valid value until enough prior candles have been seen. When the service starts, or when a new symbol becomes active in the registry, it queries the history provider over TCP for a seed dataset. Once the indicator state is initialised from history, the service transitions into live processing and begins emitting results.

## Kafka output

Once indicators are computed for a candle, the service publishes an `indicator.trigger` event to Kafka with the trading symbol as the message key. Kafka uses that key to assign the message to a consistent partition, which means all events for a given symbol always land on the same trader replica. This gives the trader effectively single-threaded processing per symbol without any application-level locking.
