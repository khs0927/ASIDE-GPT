# Aside Remote Feasibility — 2026-09-12

## Verdict

**Official remote/cloud product capability: VERIFIED.**

**Official mobile command transport via Channels: VERIFIED.**

**PC-free Cloud handoff execution with every user device offline: REQUIRES LIVE VERIFICATION.**

**Public direct developer API / hosted Remote MCP: NOT PUBLICLY VERIFIED, but no longer required for the preferred Channels/Slack path.**

## Product goal

```text
ChatGPT Mobile
  -> ChatGPT Slack connector
  -> verified Slack conversation connected to Aside Channels
  -> Aside Cloud handoff
  -> Aside Browser Agent
  -> websites
```

The browser work must be executed by Aside.

## Official evidence

### Aside pricing

The official Aside pricing page advertises:

- Pro: `Channels (Remote control)`
- Pro: `Cloud handoff`
- Team/contact-sales: `Start browser agent runs from your app, cron jobs, or internal tools.`
- Team controls for shared browser profiles, browser state, vaults, and approved team logins.

Source: https://aside.com/pricing

### Aside Channels

The official component changelog documents Channels remote control over **Slack and Telegram**, guided connection settings, durable delivery, and Telegram chat commands for session control. Later fixes cover reliable mid-run channel delivery and suspension prompts.

Source: https://docs.aside.com/changelog/components

This creates a supported product transport that ChatGPT can reach through its Slack connector without fabricating an Aside HTTP API.

### Aside public developer docs

The public developer page separately documents local developer surfaces:

- `aside "..."`
- `aside --session ...`
- `aside mcp`
- `aside repl`

The MCP example remains a local stdio process using `command: "aside"` and `args: ["mcp"]`.

Source: https://docs.aside.com/help/developers

These local surfaces are not required by the target Channels path.

### Cloud/device evidence

The official changelog includes device management for active cloud devices. The pricing page separately advertises `Cloud handoff`.

Those facts support a cloud execution/handoff product surface, but the exact no-PC semantics must be proven with a live account test rather than inferred from the word `cloud`.

## Registry and Plugin Directory checks

- HAPI MCP Registry search for `aside`: no public Aside server found on 2026-09-12.
- ChatGPT Plugin Directory search: no official Aside plugin found on 2026-09-12.
- ChatGPT Slack integration: send/read capabilities are available, making Slack the preferred inter-product bridge.

A missing direct Aside plugin or registry MCP does not block the Channels/Slack route.

## Capability matrix

| Capability | Status | Evidence |
| --- | --- | --- |
| Aside performs browser-agent work | VERIFIED | Official product + developer docs |
| Channels remote control | VERIFIED | Official pricing + changelog |
| Channels over Slack | VERIFIED | Official changelog |
| Channels over Telegram | VERIFIED | Official changelog |
| Durable Channel delivery | VERIFIED | Official changelog |
| Telegram session-control commands | VERIFIED | Official changelog |
| ChatGPT can send/read Slack | VERIFIED PRODUCT SURFACE | Connected Slack integration capabilities |
| Cloud handoff | VERIFIED PRODUCT FEATURE | Official pricing |
| Cloud device concept | VERIFIED | Official changelog |
| Start browser-agent runs from app/cron/internal tools | VERIFIED PRODUCT FEATURE | Official team/contact-sales pricing |
| Local CLI / MCP / REPL | VERIFIED | Public developer docs |
| Public direct HTTP task API | NOT PUBLICLY VERIFIED | No public contract found |
| Public hosted Aside MCP | NOT PUBLICLY VERIFIED | No public docs; HAPI search empty |
| Aside official ChatGPT plugin | NOT FOUND | Plugin Directory search |
| Slack Channels bridge from ChatGPT | ARCHITECTURALLY SUPPORTED | Both products expose supported Slack surfaces |
| Browser execution with every local user device offline | LIVE TEST REQUIRED | Must not infer from pricing alone |
| Approval round trip through Channels | LIVE TEST REQUIRED | Product supports approvals/channel delivery; exact account flow must be exercised |

## Architecture decision

`aside-remote` remains the primary provider.

The preferred transport is now `channels-slack`:

```text
ChatGPT Mobile -> Slack -> Aside Channels -> Cloud handoff -> Aside Browser Agent
```

A direct Aside API/Remote MCP remains a desirable future transport for the team programmatic-run capability but is not required to activate the Channels path.

ChatGPT Work's native browser remains an explicit non-Aside fallback only. It does not count as ASIDE-GPT success.

## Remaining completion boundary

The code can model and enforce the supported transport now. Account-level production activation requires only:

1. connect official Aside Channels to Slack;
2. identify the verified Aside-connected Slack conversation from ChatGPT;
3. run a harmless read-only task with all local Aside devices offline;
4. prove Cloud handoff still executes the Aside browser task;
5. prove a non-destructive question/approval round trip can be completed from mobile;
6. record non-sensitive evidence.

If that smoke test succeeds, the user’s PC-free requirement is met without a custom Aside API. If it fails because a local device is required, do not claim completion; pursue the team programmatic API/access path instead.
