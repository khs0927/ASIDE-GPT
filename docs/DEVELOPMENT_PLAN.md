# Sequential development and release gates

The product goal remains: mobile ChatGPT controls the **official Aside agent**
without a user PC. PR #3 must not be merged. This document separates completed
library development from external dependencies; passing unit tests is not product
completion.

| Order | Deliverable | State | Completion evidence / remaining dependency |
| --- | --- | --- | --- |
| 1 | Official interface feasibility and candidate research | Completed review | ASIDE_REMOTE_FEASIBILITY.md, OPEN_SOURCE_FUSION.md; verdict NOT PUBLICLY VERIFIED |
| 2 | Validation, state machine, durable storage, approvals, evidence | Implemented | runtime/index.ts and runtime.test.ts |
| 3 | Single submission, bounded response wait, crash reconciliation, provider event binding | Implemented | runtime/dispatcher.ts and dispatcher.test.ts; fixture adapters only |
| 4 | Official Aside adapter and approval continuation | Blocked on vendor contract | Supported hosted execution, authorization, idempotency, status, approval and result protocol |
| 5 | Authenticated remote connector host and mobile sign-in | Pending stage 4 | Supported ChatGPT onboarding, tenant identity, secure login and verified callbacks; no credentials in chat |
| 6 | Cloud deployment and real mobile acceptance | Pending stages 4–5 | Real Aside task, phone closed during work, mobile approval, matching result evidence |

## Stage 3 implementation

`TaskDispatcher` defaults to `unavailableAsidePort` and refuses to mutate a task
or submit anything. A trusted host can inject an implementation of `AsideTaskPort`.
The interface is a private normalized port, **not an invented Aside HTTP API**.
Its `available` flag is configuration, not proof of official support. Production
bootstrap must remain blocked until stage 4 has passed a contract review.

The host first creates a task in `TaskLedger`, then calls `submit`. Before any
asynchronous provider operation, a unique event ID and expected revision claim
dispatch in SQLite. Concurrent callers cannot both claim it. The stable request
key hashes the tenant and run ID; only a future vendor adapter can map it to actual
vendor idempotency or lookup semantics. Do not change a run's instruction after
dispatch; create a distinct task for a distinct user request.

A failed, malformed or timed-out response leaves the task uncertain. The deadline
aborts the local request and ignores a late result; it does **not** prove that the
remote job stopped. No automatic retry is issued. `reconcile` performs read-only
lookup, including after a crash between dispatch and acceptance. An unknown lookup
result leaves the run uncertain rather than declaring it safe to retry.

The dispatcher does not persist raw instructions or provider error bodies. The
future host must retain authorized task input securely if required for auditing;
it must not put credentials into task text. Current persistence covers state and
normalized event metadata, not a durable job queue or background scheduler.

`ingest` accepts normalized provider events only after the host verifies their
authenticity. It checks the tenant/run and accepted vendor-run binding and rejects
connector events and user decision events. Approval decisions still go through
the trusted user boundary in the ledger. No network continuation is implemented:
vendor acknowledgement, approval-ID binding and retry semantics need the official
contract before sending any externally effective continuation.

## Remaining acceptance tests (cannot be replaced by fixtures)

1. Obtain official account authorization from mobile without copying secrets.
2. Submit a read-only task while no user device runs Aside Browser/CLI.
3. Close the phone and establish that Aside's hosted job continues.
4. Read status and reconnect to the same authenticated browser session.
5. Prepare an externally effective action and display its exact details on mobile.
6. Deny it and prove no external effect occurred; separately approve a test action
   and prove the provider applied it once.
7. Retrieve matching final URL, observed values and useful evidence.
8. Exercise expiration, disconnect, duplicate callbacks, tenant separation and
   cancellation against the actual service.

No paid deployment, substitute browser agent, private endpoint or mobile success
claim is authorized by the existence of this framework. The repository can be
advanced through stage 3 now; full product completion remains dependent on the
official service and a supported mobile connection path.
