# Notifications

Delivers email notifications to users when their robots open or close positions.

## Job queue

Events arrive from Kafka on the `notification.send` topic, produced by the positions service. Rather than attempting email delivery directly on the Kafka consumer thread, each event is enqueued into a Bull job queue backed by Redis. The consumer acknowledges the message and moves on immediately. The job processor handles the actual Gmail OAuth2 delivery asynchronously.

The queue layer exists to protect the consumer. If Gmail is slow, rate-limiting, or temporarily unavailable, that should not cause Kafka consumer lag to build up. The queue absorbs the variance entirely — the consumer stays fast and the delivery pipeline retries independently.

## Failure handling

If a delivery attempt fails, Bull retries with exponential backoff. After five failed attempts the job is marked permanently failed and written to MongoDB for manual inspection. This gives visibility into delivery failures without losing the original event data. Successfully delivered jobs are removed from the queue automatically.
