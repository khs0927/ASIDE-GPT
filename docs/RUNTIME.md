# Durable connector runtime

`packages/runtime/index.ts` is an internal library, not a public MCP server or
Aside remote API implementation. Requires Node >=22.13.0 (SQLite may emit an
experimental warning on Node 22). XState 5.32.6 and Zod 4.6.2 are MIT-licensed;
their upstream license files ship in the installed packages.

```ts
import { TaskLedger } from './packages/runtime/index.js';
const ledger = new TaskLedger('/persistent-volume/tasks.db');
ledger.create('authenticated-tenant', 'task-123');
ledger.append('authenticated-tenant', 'task-123', 'event-1', 0,
  { type: 'SUBMIT_STARTED' });
// No provider is called. A future verified adapter must supply subsequent events.
ledger.close();
```

The path above belongs to the operator's cloud host, never the mobile user.
The host must enforce tenant identity, authorization, webhook authenticity,
rate limits and secure storage permissions. SQLite is not encrypted by this
library; use encrypted storage, retention and backups before handling real data.
There is no network listener, callback endpoint, polling loop or background worker.

| State | Accepted progress | Safety behavior |
| --- | --- | --- |
| created | SUBMIT_STARTED | Does not itself send a request |
| dispatching | ACCEPTED, TIMEOUT | Timeout enters uncertain |
| uncertain | RECONCILED | No resubmit transition; reconcile or operator handling |
| running | APPROVAL_REQUIRED, SIGNIN_REQUIRED, COMPLETE | Completion must bind provider/run evidence |
| waiting_approval | DECIDE | Exact digest, ID and expiry required |
| approval_decided | RESUMED | Only approved and still unexpired |
| waiting_signin | RESUMED | Host verifies secure login; never ingest credentials |
| completed / failed / cancelled | None | Terminal states cannot restart |

In active states a verified `FAILED` or `CANCEL_CONFIRMED` event can terminate a
run. Denial alone does not claim that a provider cancelled. A persisted dispatch
without acceptance after restart is ambiguous even without a TIMEOUT event;
recovery must reconcile, never infer non-execution. No provider invocation is
replayed by XState because this machine has no invoked services or effect actions.

`append(tenant, runId, eventId, expectedRevision, input)` is transactional. A repeat
of the exact parsed event under the same event ID returns the current run (which
may have advanced), not the historical event's result. Reuse with changed content
throws. Concurrent stale writers receive a revision conflict and must re-read.
Business idempotency still depends on the upstream API: local deduplication alone
cannot guarantee exactly-once remote execution.

Evidence is bounded metadata, not cryptographic provenance. Future provider
verification, screenshot storage/redaction, evidence freshness policy, schema
migrations, retention, deletion and a production deployment remain outstanding.
The test suite uses fixture events only and does not contact Aside or prove
mobile end-to-end automation.

## Submission and recovery service

`runtime/dispatcher.ts` adds a bounded submission/reconciliation service with an
injected internal provider port. The default port is unavailable. It has no
background scheduler or HTTP listener, and does not implement the official Aside
adapter. See [the sequential development gates](DEVELOPMENT_PLAN.md) for its
concurrency behavior, timeout semantics and production acceptance requirements.
