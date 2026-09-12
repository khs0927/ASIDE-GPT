# Aside PC-free remote execution feasibility

Reviewed: 2026-09-12

## Verdict

**Product capability: CONFIRMED**  
**Public developer contract: NOT PUBLISHED**  
**ASIDE-GPT integration state: ACCESS-GATED**

This is deliberately different from `UNSUPPORTED`.

Aside's official public pricing page now advertises remote/cloud capabilities that match the product goal:

- Pro: **Channels (Remote control)**
- Pro: **Cloud handoff**
- Team/scale offering: **Start browser agent runs from your app, cron jobs, or internal tools**
- Team/scale offering: shared profiles, managed browser state, and agent access to team logins without exposing raw secrets

Official source: https://aside.com/pricing

The official changelog also contains a **Device management** feature that shows active cloud devices and allows signing out a remote device.

Official source: https://docs.aside.com/changelog/components

These are strong first-party signals that Aside has a remote/cloud execution surface beyond the local CLI-only workflow.

## What is publicly documented today

The public developer Help Center documents:

- `aside "..."`
- `aside --session <id> "..."`
- `aside mcp`
- `aside repl`
- account selection for CLI runs

The documented MCP example is local stdio:

```json
{
  "mcpServers": {
    "aside": {
      "command": "aside",
      "args": ["mcp"]
    }
  }
}
```

Official source: https://docs.aside.com/help/developers

The full public documentation index at https://docs.aside.com/llms.txt does not currently expose a Channels API, Cloud Handoff API, task REST API, Remote MCP endpoint, OAuth schema, or webhook reference.

## Registry and ChatGPT checks

- HAPI MCP Registry search for `Aside`: no registered public Aside server was returned on 2026-09-12.
- ChatGPT Plugin Directory search for `Aside browser automation`: no Aside plugin was returned on 2026-09-12.

Those checks do **not** negate the first-party pricing claims. They only show that the integration surface is not currently discoverable through those public registries.

## Correct interpretation

The previous repository conclusion said that hosted Aside execution was unverified and treated Aside as a future provider. That conclusion was too strong because it did not account for the current official pricing page.

The corrected state is:

```text
Aside remote/cloud product capability      CONFIRMED
Public endpoint/auth/schema                NOT PUBLISHED
Direct ASIDE-GPT HTTP adapter              BLOCKED BY ACCESS CONTRACT
Local-PC fallback                          NOT ACCEPTABLE AS PRODUCT PATH
Work Cloud Browser substitution            EXPLICIT OPT-IN ONLY
```

## Target architecture

```text
ChatGPT Mobile
      |
      v
ASIDE-GPT thin connector
      |
      v
Official Aside remote surface
(Channels / Cloud handoff / managed agent-run API)
      |
      v
Aside Browser Agent
      |
      v
Remote websites
```

ASIDE-GPT must remain thin. It may translate requests, forward approvals, track task state, and return evidence. It must not recreate Aside's browser engine.

## What is still required from Aside

One official access artifact is enough to finish the live adapter:

1. an official hosted API/SDK documentation URL;
2. an official Remote MCP/Channels connection URL;
3. an official account entitlement/invite exposing remote agent runs;
4. an official API schema plus authentication instructions; or
5. written Aside support/sales confirmation that identifies the supported integration path.

The minimum callable contract needs these operations or equivalents:

- create/submit task
- get task/run status
- receive pending question/approval
- approve/deny/resume
- get result/evidence/screenshots
- official OAuth/API-key/service-account authorization

Do not send passwords, OTPs, cookies, browser profile files, refresh tokens, or private session material into GitHub or ChatGPT.

## No reverse engineering

ASIDE-GPT must not infer private endpoints from browser traffic, scrape internal API tokens, or depend on undocumented production endpoints. Aside itself may reverse-engineer websites as part of its browser-agent operation; that does not authorize ASIDE-GPT to reverse-engineer Aside.

## Completion rule

The repository is code-complete for the public-information boundary when it:

- treats official Aside remote execution as the primary provider;
- never silently swaps to Work Browser;
- exposes an explicit `blocked/access-required` state when no official remote surface is connected;
- keeps Work Browser only as an explicit user-approved fallback;
- documents exactly which official access artifact unlocks the live adapter.

The final network adapter can only be completed after Aside exposes or grants the supported remote contract.
