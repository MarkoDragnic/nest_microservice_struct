# Positions

Records the outcome of every trade and maintains the state of open positions.

## Transactional writes

The trader sends two TCP events — one when a position opens and one when it closes. Both writes are wrapped in a TypeORM transaction: the position record and the corresponding funds update either both commit or neither does. There is no state where a position is recorded as closed but the user's balance has not been updated, or vice versa. The atomicity guarantee lives here so the trader does not have to reason about partial failures.

## Downstream handoff

After a successful write, the service publishes a Kafka event on the `notification.send` topic. This is where positions hands off to the notifications pipeline — it signals that something happened and moves on. Positions has no knowledge of emails, templates, or delivery. That decoupling means the notifications pipeline can be slow, retrying, or temporarily unavailable without stalling the trader's critical path.
