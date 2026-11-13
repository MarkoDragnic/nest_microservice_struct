# History Provider

Serves historical close prices over TCP to the indicators service, which uses them to seed an indicator the first time it sees a symbol, period and interval.

## Cache-aside

Every request checks MongoDB first. If the whole requested range is stored there, it is returned immediately. If not, the service falls back to the Binance REST klines endpoint, stores the candles in MongoDB, and then returns their close prices. If Binance returns fewer candles than requested, the answer is an empty list. From the caller's perspective the source is transparent: it always receives a list of close prices, regardless of whether the data came from MongoDB or the exchange.

## Why a separate service

Historical lookups against an external REST API are slow and potentially rate-limited. Isolating the history fetch into its own service keeps that logic out of the indicators service, which waits for an answer no longer than its TCP timeout, and keeps the fallback to Binance in one place.
