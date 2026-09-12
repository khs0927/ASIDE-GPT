# Project Status — 2026-09-12

## Done

- User-PC/local-node architecture archived as legacy.
- Mobile-only requirement established.
- Policy, approval, evidence, schema, skills, and CI scaffolding completed.
- Official Aside remote/cloud product capabilities re-verified.
- Official `Channels` remote control over Slack/Telegram identified as the preferred public command transport.
- ChatGPT Slack send/read capability verified through the connected Slack integration surface.
- `aside-remote` remains the primary browser provider; Work-native remains explicit non-Aside fallback only.
- Channel setup and no-PC Cloud handoff readiness are modeled as separate gates.
- Tests prevent guessed Channel destinations, silent fallback, and unverified PC-free claims.

## Remaining account-level activation gates

### 1. Connect Aside Channels to Slack

A Slack conversation must be connected through the official Aside Channels UI and then verified from ChatGPT. A channel name alone is not evidence of an Aside connection.

Current project state when this is absent:

`aside-channel-setup-required`

### 2. Prove Cloud handoff with no user device online

`Channels` proves remote control. The project still requires a live smoke test proving that an actual Aside browser task starts or continues while no user-owned PC/Mac/local Aside process is online.

Current project state before that test passes:

`cloud-no-pc-execution-not-live-verified`

## Optional future direct transport

Aside's team offering advertises browser-agent runs started from apps, cron jobs, or internal tools. The public developer docs do not currently expose the external endpoint/auth/schema, so a direct API/Remote MCP remains optional future work. It is no longer the only possible mobile-control path because official Channels provides a public product transport.

## Ready state

The codebase is ready for the one-time account setup and live no-PC smoke test documented in `ASIDE_CHANNELS_SLACK.md` and `REMOTE_ACTIVATION_CHECKLIST.md`. No new browser engine, user PC bridge, personal tunnel, or reverse-engineered Aside API is required by the target architecture.
