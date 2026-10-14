# ASIDE-GPT

ASIDE-GPT is a **local-first orchestrator** for the official Aside browser agent. It uses free or already-paid paths first (local models, existing subscriptions, the signed-in Gemini website) and keeps the official Aside Remote API as a future track instead of a prerequisite.

```text
ASIDE-GPT
├─ Model runtime      Ollama / LM Studio · ChatGPT/Claude subscriptions · Gemini (AI Pro) via web or agy
├─ Browser runtime    Aside REPL → Aside agent → Browser Control / Playwright MCP (opt-in) → Aside Remote (future)
└─ Gemini transport   built-in Gemini Web bridge → Antigravity CLI → mcp-web-llm → hermes-gem-pw → web2api (experimental)
```

If one provider is blocked (AI Studio 429, Aside credits 402, a Gemini UI change, no Remote API), the others keep working.

## Quick start: Gemini from your AI Pro subscription

```bash
npm ci && npm run build && npm link      # Windows: scripts\install.ps1
aside-gpt chrome                         # dedicated Chrome profile; sign in to Gemini once
aside-gpt doctor
aside-gpt ask "Reply with only: ASIDE_GEMINI_OK"
aside-gpt serve                          # OpenAI-compatible API at http://127.0.0.1:8765/v1
aside-gpt mcp                            # MCP tools: gemini_ask, gemini_status
aside-gpt setup-agy                      # let Antigravity use Aside (aside mcp) and Gemini Web together
aside-gpt probe-aside                    # measure whether Aside REPL calls hit credit limits
```

Aside's model settings do not document Ollama/LM Studio/custom endpoints, so Gemini cannot run *inside* Aside today. Instead Gemini (through `agy` or any MCP host) drives Aside as a tool via `aside mcp`, and calls `gemini_ask` for a second opinion. Details, configuration, security boundaries, and what is not yet verified against production: [docs/LOCAL_BRIDGE.md](docs/LOCAL_BRIDGE.md). Runtime selection rules: [docs/VNEXT_RUNTIME.md](docs/VNEXT_RUNTIME.md).

## Mobile ChatGPT: official MCP tunnel while an Aside host is online

A verified-by-mocks integration helper for the **official** Aside stdio MCP via OpenAI Secure MCP Tunnel is available at [docs/ASIDE_MOBILE_MCP_TUNNEL.md](docs/ASIDE_MOBILE_MCP_TUNNEL.md). It never copies browser cookies, credentials, or invents an Aside endpoint. The user-facing ChatGPT interface can be mobile, but the Aside Browser daemon **must remain online on a supported execution host**. This is **not** the PC-free official Remote track below and is not yet live-tested. See Draft PR #26 for CI and remaining activation gates.

## Aside Remote (future track)

The original goal — run Aside from mobile ChatGPT without a PC online — still depends on Aside publishing its remote contract. That track is kept, fail-closed, below.

### Current verified state

Official Aside product material currently verifies remote/cloud capabilities:

- **Channels (Remote control)** on Pro.
- **Cloud handoff** on Pro.
- Team/contact-sales capability to **start browser agent runs from your app, cron jobs, or internal tools**.
- The official changelog includes management of **active cloud devices**.

Sources:

- https://aside.com/pricing
- https://docs.aside.com/changelog/components
- https://docs.aside.com/help/developers

What is **not yet publicly documented** is the external developer contract behind those remote/cloud features: endpoint or Remote MCP URL, authentication/OAuth schema, run-status contract, remote approvals, and result/artifact retrieval.

For that reason ASIDE-GPT does not invent an API. The active provider state is `official-aside-access-required` until Aside publishes or grants the supported integration contract.

See [docs/ASIDE_REMOTE_FEASIBILITY.md](docs/ASIDE_REMOTE_FEASIBILITY.md), [docs/ASIDE_ACCESS_REQUEST.md](docs/ASIDE_ACCESS_REQUEST.md), and [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md).

## Success criterion

A task counts as **ASIDE-GPT execution** only when the actual browser work is performed by Aside.

```text
Mobile ChatGPT
  -> ASIDE-GPT planner/provider gate
  -> durable dispatch + approval/recovery state
  -> official Aside Remote / Channels / Cloud Handoff surface
  -> Aside Browser Agent
```

Using another browser engine can be an explicitly requested fallback, but it must be labeled as non-Aside execution and does not satisfy the core project goal.

## What is implemented

- `packages/providers/`: Aside Remote is the primary target provider; silent replacement is prohibited.
- `packages/providers/remote-contract.ts`: transport-neutral target contract for official submit/status/recovery/input/cancel/result behavior.
- `packages/orchestration/`: task planning plus a high-level `AsideOrchestrator` that binds provider readiness to the durable runtime.
- `packages/runtime/`: XState + SQLite task ledger, transactional dispatch claims, restart recovery, ambiguous-delivery reconciliation, exact-action approvals, and provider evidence binding.
- `packages/policies/`: task risk and confirmation rules.
- `packages/approvals/`: approval boundaries retained for consequential actions.
- `packages/evidence/`: evidence requirements for completed browser work.
- `packages/decisions/`: optional typed semantic decision adapter for Jev 1.13; it does not perform browser work or replace the main model.
- `plugin/skills/`: mobile workflow skills, including `aside-remote`, `orchestration`, and `jev-decision`.
- `providers/aside/`: verified capability record and activation boundary.
- `legacy/local-node/`: archived first prototype that required a PC/local Aside process. It is not part of the target architecture.

The orchestrator is safe to construct without a provider adapter: it performs no browser/network execution and returns `official-aside-access-required`. When a supported official `AsideRemoteAdapter` is supplied, the same planner becomes ready and browser work is routed through Aside.

## Gemini Web through Aside

A target-site skill for using the signed-in Gemini website through Aside is available at `plugin/skills/gemini-web/SKILL.md`.

This skill keeps Aside as the browser executor and treats Gemini as the website being operated. The separate local bridge (`aside-gpt ask|serve|mcp`, see [docs/LOCAL_BRIDGE.md](docs/LOCAL_BRIDGE.md)) drives its own dedicated Chrome profile and can fall back to Antigravity; neither path reuses Google cookies as API credentials or calls AI Studio. See [docs/GEMINI_WEB_ASIDE.md](docs/GEMINI_WEB_ASIDE.md) for rollout and smoke tests.

## Orchestration behavior

The active flow is:

1. classify the task and risk;
2. resolve Aside as the primary provider;
3. fail closed if no official adapter is connected;
4. create one durable run and stable request key;
5. dispatch once;
6. on ambiguous delivery, reconcile instead of resubmitting;
7. bind consequential confirmation to the exact canonical action and expiry;
8. require provider acknowledgement before resume;
9. reject chat-based secret entry for sign-in;
10. require matching Aside task/result evidence before success.

## Explicitly not required by the Remote track

These apply to the mobile Remote track only. The local-first runtime above deliberately runs on the user's PC, uses a loopback-only bridge, and drives a dedicated Chrome profile; it still never extracts cookies or passwords.

```text
NO user PC requirement
NO localhost bridge
NO home server
NO personal tunnel
NO local Aside CLI requirement
NO replacement Playwright browser
NO reverse-engineered Aside private API
NO cookie/password extraction
```

## Verification

```bash
npm install
npm run ci
```

The CI suite verifies that:

- Aside Remote remains the primary provider.
- Work-native cannot be selected silently.
- non-Aside fallback requires explicit opt-in.
- unavailable official Aside access produces a blocked state instead of a fabricated endpoint.
- a connected fixture adapter activates the Aside route without changing static product claims.
- timeout/ambiguous submission never causes automatic resubmission.
- approval is bound to the exact canonical action and provider acknowledgement.
- secure sign-in cannot accept chat secrets.
- completion requires matching Aside run evidence.
- Jev requests use the dedicated System One contract and never masquerade as chat or browser execution.
- all plugin skills validate and TypeScript builds cleanly.

## Activation

When Aside publishes or grants the official remote integration contract, implement only the thin adapter required for:

1. authentication;
2. task submission and safe request-key/idempotency behavior;
3. task status and reconciliation;
4. follow-up/steering;
5. approval relay and acknowledgement;
6. cancellation;
7. result/screenshots/files/artifact retrieval.

Then run the no-PC smoke tests in [docs/REMOTE_ACTIVATION_CHECKLIST.md](docs/REMOTE_ACTIVATION_CHECKLIST.md) and the release gates in [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md).

Until then the repository is complete up to the official vendor integration boundary. The missing piece is not another browser implementation; it is access to Aside's already-advertised remote/cloud control surface.

## Optional Jev decision plane

ASIDE-GPT also includes a typed Jev 1.13 adapter for bounded `choice`, `noul`, and `score` decisions. Jev is a hosted decision model, not a chat model and not a browser provider. The main planner and the official Aside Browser Agent remain responsible for reasoning, browsing, tool use, explanations, and side effects. See [docs/JEV_DECISION_PROVIDER.md](docs/JEV_DECISION_PROVIDER.md).
