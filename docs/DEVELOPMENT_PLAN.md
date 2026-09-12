# Sequential development and release gates

The product goal remains: mobile ChatGPT controls the **official Aside Browser Agent** without a user PC. Product-level remote/cloud capability is verified in official Aside material; the generic external developer contract is not yet publicly documented or connected.

| Order | Deliverable | State | Completion evidence / remaining dependency |
| --- | --- | --- | --- |
| 1 | Official product feasibility | Completed | `ASIDE_REMOTE_FEASIBILITY.md`: remote/cloud product features verified; public external contract not published |
| 2 | Provider policy, mobile skill, adapter boundary | Implemented | Aside-first routing, `AsideRemoteAdapter`, access request and activation checklist |
| 3 | Durable state, approvals, evidence binding | Implemented | `packages/runtime/index.ts` + runtime tests |
| 4 | Single dispatch, timeout ambiguity and reconciliation | Implemented | `packages/runtime/dispatcher.ts` + dispatcher tests; fixture ports only |
| 5 | Official Aside live adapter | Blocked on official contract/access | Needs supported auth, idempotency/lookup, status, approval/continuation and result protocol |
| 6 | Authenticated remote connector host | Pending stage 5 | Hosted identity, verified callbacks/events, encrypted persistence and secure mobile authorization |
| 7 | Real mobile no-PC acceptance | Pending stages 5–6 | Real Aside run, phone disconnect continuation, mobile approval and matching evidence |

## Implemented fail-closed behavior

The dispatcher defaults to an unavailable provider port and returns `official-aside-access-required` before mutating a task or making any network call. A provider implementation is an internal normalized port, not an invented Aside API.

Before any asynchronous submit, a unique event and expected revision claim dispatch in SQLite. Parallel callers cannot both submit the same run. A stable request key is generated for a future official idempotency/lookup mapping.

A timeout, malformed response or process crash can leave remote execution ambiguous. In that state the system does not retry submission. It permits only read-only reconciliation. An unknown lookup remains `uncertain` rather than being treated as permission to submit again.

Provider events must be authenticated by the future host and are additionally bound to the accepted vendor run. Provider ingress cannot issue connector lifecycle events or user approval decisions.

## Live acceptance tests still required

When official Aside access is granted, run these tests before claiming full end-to-end completion:

1. Authorize the official Aside remote surface from mobile without copying secrets into chat.
2. Submit a read-only task while no user PC or local Aside Browser/CLI is running.
3. Close/disconnect the phone and confirm the Aside run continues.
4. Reconnect and retrieve status for the same run/session.
5. Trigger a test action that requires confirmation and show its exact target/effect on mobile.
6. Deny once and prove no external effect occurred; approve a separate safe fixture action and prove it executes once.
7. Retrieve matching final URL, result values and Aside-provided screenshots/artifacts.
8. Exercise expiration, disconnect, duplicate events, cancellation and tenant separation against the real service.

No substitute browser, private endpoint, scraped cookie, or fixture test may be used to claim these live acceptance gates passed.
