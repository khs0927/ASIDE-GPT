# ADR-0001: Make the active architecture mobile-only and Work-native

- Status: superseded by ADR-0002
- Date: 2026-09-12

## Context

This ADR removed the invalid requirement for a user-controlled PC and moved the project toward a mobile-only architecture. That correction remains valid.

However, the original decision also made ChatGPT Work's native cloud browser the primary browser provider because the initial research did not verify a PC-free Aside remote product path.

Subsequent research found newer official Aside product evidence: the official pricing page advertises `Channels (Remote control)`, `Cloud handoff`, and team-scale browser-agent runs started from apps, cron jobs, or internal tools. The public developer documentation still does not publish the generic endpoint/auth/schema for those commercial remote capabilities.

## Superseded decision

The statement that Work's native cloud browser is the default provider is superseded. See `ADR-0002-aside-remote-first.md`.

## Decisions retained

- No user PC, local browser, localhost bridge, home server, or personal-machine tunnel is required by the target architecture.
- The legacy local gateway/node prototype remains archived under `legacy/local-node/` and excluded from the active package and CI.
- No private OpenAI or Aside API is invented.
- Sensitive actions remain approval-gated.
