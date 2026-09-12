# Providers

## Decision

`aside-official-remote` is the primary browser provider.

Aside's official pricing confirms remote/cloud product capability through Channels (Remote control), Cloud handoff, and team-scale browser-agent runs triggered from apps, cron jobs, or internal tools. The public developer docs do not yet publish the generic remote endpoint/auth/schema required for a third-party client to call that capability directly.

Therefore the active policy is:

1. Use an officially connected/authorized Aside remote surface when available.
2. If no official Aside remote surface is connected, return a blocked/access-required route.
3. Never invent a private Aside API or reverse-engineer unsupported endpoints.
4. Never silently substitute another browser and call the result Aside.
5. `work-native` is a fallback provider only after explicit user opt-in.

`future-provider` remains a placeholder and is never selected by default.

## Provider matrix

| Provider | Role | Product capability | Public callable contract | Default behavior |
| --- | --- | --- | --- | --- |
| `aside-official-remote` | Primary | Confirmed | Not publicly published in reviewed docs | Use when officially connected; otherwise block |
| `work-native` | Explicit fallback | Host-provided | Host-internal | Use only after user opt-in |
| `future-provider` | Optional | Unknown | None | Never auto-select |

## Invariants

- Provider selection never asks the user to keep a PC, local browser, or CLI running for the target architecture.
- A provider adapter must not accept passwords, OTPs, cookies, bearer tokens, or other secrets pasted into chat.
- Sensitive external effects remain approval-gated.
- The execution provider must be reported truthfully in evidence/results.
