# Price Provider

Maintains a persistent WebSocket connection to Binance and distributes live price updates to the rest of the system via Redis pub/sub.

## Connection management

WebSocket connections to external services drop — network hiccups, exchange maintenance, temporary rate limits. The service reconnects using exponential backoff with jitter so that a sudden disconnect does not produce a flood of immediate reconnect attempts against the exchange. The backoff ceiling prevents indefinite growth while the jitter prevents multiple instances from all retrying at the same moment.

## Distribution

Once connected, incoming price ticks are published to Redis channels keyed by symbol. Any internal service that wants a price stream subscribes to the relevant channels and processes updates independently. This means the provider is the only component in the cluster that holds a live connection to Binance's streaming API — internal consumers are completely decoupled from the WebSocket lifecycle and have no awareness of reconnects or gaps.
