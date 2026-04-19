# History Provider

Serves historical candle data over TCP, primarily to the indicators service during startup warmup.

## Cache-aside

Every request checks MongoDB first. If the requested range is present in the cache, it is returned immediately. If not, the service falls back to the Binance REST klines endpoint, caches the result in MongoDB, and then returns it. From the caller's perspective the source is transparent — it always receives the same candle array regardless of whether the data came from cache or the exchange.

## Why a separate service

Historical lookups against an external REST API are slow and potentially rate-limited. Embedding that logic inside the indicators service would mean the Kafka consumer thread could stall waiting for a slow Binance response on warmup. Isolating the history fetch into its own service keeps the indicators consumer path clean, and contains all caching behaviour — MongoDB schema, TTL decisions, fallback strategy — in one place.
