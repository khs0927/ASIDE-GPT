# ASIDE-GPT orchestration

## Objective

ASIDE-GPT coordinates mobile ChatGPT requests without becoming a second browser agent. The browser work counts as ASIDE-GPT success only when the official Aside Browser Agent performs it.

```text
Mobile ChatGPT
    |
    v
Planner / policy
    |
    v
Provider gate
    |
    +-- no official Aside adapter --> official-aside-access-required
    |
    v
Durable dispatcher + task ledger
    |
    v
Official Aside remote adapter
    |
    v
Aside Browser Agent
    |
    +--> approval / secure sign-in / status
    |
    v
Evidence verification
```

## Orchestration lanes

### 1. Planning lane

`planTask()` classifies the request as `READ`, `WRITE`, or `EXTERNAL_EFFECT`, selects the browser provider, and prepares confirmation/evidence stages. Confirmation and evidence stages are added only when an execution provider is actually ready.

### 2. Provider gate

Aside is the primary provider. An injected `AsideRemoteAdapter` is the only condition that marks the Aside route ready inside the runtime. Product marketing or a guessed endpoint never marks it ready.

Without an official adapter the engine returns `official-aside-access-required`. Work Browser can be returned only as an explicit non-Aside handoff after user opt-in.

### 3. Durable dispatch lane

`TaskDispatcher` and `TaskLedger` provide:

- one transactional dispatch claim;
- stable connector request keys;
- revision checks;
- duplicate event protection;
- restart recovery;
- timeout -> `uncertain` rather than success/failure;
- no automatic resubmission after ambiguous delivery.

When the official contract supports lookup by a client request key, reconciliation is read-only and can attach the existing Aside task to the local run.

### 4. Provider synchronization lane

`AsideOrchestrator.sync()` maps official provider state into the durable state machine:

- queued/running -> active run;
- approval request -> `waiting_approval`;
- secure sign-in request -> `waiting_signin`;
- completed -> completion only after matching result evidence;
- failed/cancelled -> terminal state.

A provider task ID must match the task already bound to the connector run.

### 5. Approval lane

The adapter must supply a canonical action, approval ID, and expiry for a consequential approval. ASIDE-GPT hashes the canonical action and binds the user's decision to that digest.

Approval is not complete merely because the user tapped approve. The run resumes only after the provider acknowledges continuation. A failed delivery is left in an uncertain/decided state and is not blindly retried.

### 6. Authentication lane

Passwords, passkeys, OTPs, cookies, recovery codes, card details, vault secrets, and browser profile data must never be entered through chat. When Aside reports a sign-in requirement, the orchestrator pauses and requires the official secure Aside authorization UI.

### 7. Evidence lane

A completion claim requires matching Aside provider identity, provider task ID, and final URL. Richer official results such as screenshots, files, session IDs, and source links remain available through the adapter result contract.

If a provider says `completed` but does not provide the minimum final evidence, the local run remains unverified rather than being marked successful.

## Adapter boundary

`packages/providers/remote-contract.ts` is an internal normalized contract, not the Aside wire protocol. It deliberately contains no endpoint, OAuth client ID, token format, webhook secret, or MCP URL.

The official implementation may later be backed by any first-party supported transport, including a documented HTTP MCP server, REST API, SDK, Channel transport, webhook/task API, or another official interface.

## Development-time plugin orchestration

Repository development uses external plugins as separate evidence lanes rather than runtime dependencies:

- GitHub: code, PR, CI, issues, merge state;
- Exa: current official Aside/web research;
- HAPI MCP Registry: public MCP registration checks.

These plugins do not execute the production browser task and cannot be treated as a replacement for Aside.

## Release gate

A live mobile release requires all of the following:

1. official remote task submission;
2. supported external authentication;
3. safe idempotency or request-key recovery;
4. task status/follow-up;
5. approval/resume acknowledgement;
6. secure sign-in UX;
7. cancellation semantics;
8. result/artifact retrieval;
9. no-PC hosted execution test;
10. mobile end-to-end acceptance with matching evidence.

Until those vendor-facing items are available, the connector remains fail-closed while all internal orchestration logic stays testable with fixture adapters.
