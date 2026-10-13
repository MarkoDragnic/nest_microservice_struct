# 004. Lock order for money transactions, and a known gap in order placement

Status: Accepted (lock order), Deferred (order placement)
Date: 2026-10-12

## Context

While checking where a robot's funds get updated, I found two problems in how a trade opens and closes.

The first one is locking. Close locked the position and the robot, then funds. Open locked funds first, then inserted the position, and that insert needs a lock on the robot row because of the foreign key. An open and a close on the same robot at the same time could deadlock. Postgres would kill one of them, so nothing hangs, but the trade fails. It mostly didn't happen because one trader replica handles one symbol in order, but I don't want correctness to depend on that.

The second one is the order of things. Trader sends the order to Binance and only after that asks pg_write to open the position, and the funds check is in pg_write. So if pg_write says no (not enough funds, robot gone, database down, a timeout between services), the order is already done on the exchange and there's no record of it. Closing has the same shape the other way around. Test accounts don't send real orders, which is why it never showed up.

## Decision

Every transaction that touches a robot's money locks the robot row first, then funds, then the position. The robot lock works like a mutex per robot, and two transactions that always start with the same lock can't deadlock. This is done.

The order placement problem I'm leaving as a known gap for now. The proper fix changes how trading works end to end: reserve the funds first, then send the order with the position id as the client order id, then confirm or release, with a reconciler for orders whose outcome is unclear. That means new position states, new columns and a new background job. It's a feature on its own, and it's not what this round of work is about, which is the library split and the CQRS work after it.

If I come back to it, I'd start with the smallest version: open the position (which reserves the funds under the lock) before sending the order, and if the exchange rejects the order, undo the open in one transaction. That closes the "money spent with no record" case without new states. Unclear outcomes like timeouts would still need the reconciler.

## Other options

Fix it fully now. Rejected for scope, not because the design is wrong.

Compensate after the fact by selling back what was bought when pg_write refuses. Costs fees and slippage, and the compensating order can fail too.

## Consequences

Open and close can't deadlock on the same robot anymore. An indicators update on a robot waits while a trade on it is in progress, which is a few milliseconds and correct anyway.

On a live account, an order can still be sent that pg_write then refuses. Until this is fixed, the robots should run on test accounts only, which is already the rule for this project.