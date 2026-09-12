# Durable connector runtime

`packages/runtime/` is an internal library for safely tracking future official Aside remote runs. It is **not** a public MCP server, browser engine, or implementation of an undocumented Aside API.

It requires Node >=22.13.0 and uses Node's built-in SQLite plus pinned XState and Zod packages.

## Why it exists

Once Aside exposes or grants the official remote contract, the connector needs durable state across mobile disconnects, cloud restarts, approvals, timeouts, and duplicate provider events. The runtime provides that state boundary before any live adapter is activated.

## State model

| State | Accepted progress | Safety behavior |
| --- | --- | --- |
| `created` | `SUBMIT_STARTED` | No provider request is made by the ledger itself |
| `dispatching` | `ACCEPTED`, `TIMEOUT` | Timeout becomes `uncertain` |
| `uncertain` | `RECONCILED` | Never auto-resubmit; lookup/reconcile only |
| `running` | approval, sign-in, completion | Completion evidence must match the accepted Aside run |
| `waiting_approval` | user decision | Approval ID, exact action digest and expiry must match |
| `approval_decided` | provider acknowledgement | A denial cannot resume; an approval may be consumed once |
| `waiting_signin` | verified resume | Credentials are never stored by this library |
| terminal states | none | Cannot restart the completed/failed/cancelled run |

`TaskLedger.append(...)` uses an immediate SQLite transaction, optimistic revision checks, event IDs, and strict Zod parsing. Duplicate identical events are idempotent; conflicting reuse of an event ID is rejected.

## Submission and reconciliation

`packages/runtime/dispatcher.ts` adds a bounded `TaskDispatcher` over an injected `AsideTaskPort`. The default port is unavailable and fails with `official-aside-access-required` before state mutation or network access.

A future official adapter may implement the port only from a supported Aside contract. Before the asynchronous submit call, the dispatcher claims the run in the ledger. If the response is malformed or times out, the run becomes `uncertain`. The connector does not assume failure and does not submit again. `reconcile()` performs read-only lookup using a stable request key.

Provider events are accepted only after the host verifies their authenticity and only when the event's vendor run ID matches the run recorded by the connector. Provider ingress cannot manufacture user approval decisions.

## Deployment boundary

The SQLite path belongs to a future cloud connector host, never the mobile user's device. Production hosting must supply authenticated tenants, authorization, provider-event verification, encrypted storage/backup/retention, rate limits, and secure official Aside authentication.

Current tests are fixture-only. Passing them proves connector state safety, not live Aside remote execution. End-to-end completion still requires the official Aside remote integration contract described in `ASIDE_ACCESS_REQUEST.md` and `REMOTE_ACTIVATION_CHECKLIST.md`.
