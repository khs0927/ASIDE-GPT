# Aside Remote Feasibility — 2026-09-12

## Verdict

Overall verdict for PC-free mobile ChatGPT execution: **NOT PUBLICLY VERIFIED**.
The verified items below are advertised product features, not proof that a user
can onboard or execute browser tasks without a desktop. Cloud handoff, cloud
devices and Channels alone do not establish an Aside-hosted browser contract.
See [ADR-0003](ADR-0003-aside-playwright-composition.md) for composition limits.

**Official remote/cloud product capability: VERIFIED.**

**Public developer API / Remote MCP contract for direct ChatGPT integration: NOT PUBLICLY VERIFIED.**

This replaces the earlier blanket `UNSUPPORTED` conclusion.

## Product goal

ASIDE-GPT must not replace Aside with another browser engine. The success path is:

```text
ChatGPT Mobile
  -> minimal ASIDE-GPT connector
  -> official Aside remote/cloud execution surface
  -> Aside Browser Agent
  -> websites
```

The browser work must be executed by Aside.

## Official evidence

### Aside pricing

The official Aside pricing page currently advertises:

- Pro: `Channels (Remote control)`
- Pro: `Cloud handoff`
- Team/contact-sales offering: `Start browser agent runs from your app, cron jobs, or internal tools.`
- Team controls for shared browser profiles, browser state, vaults, and approved team logins.

Source: https://aside.com/pricing

These claims establish that remote control, cloud handoff, and programmatic triggering of browser-agent runs exist as supported product capabilities at some plan/access levels.

### Aside public developer docs

The public developer page documents local developer surfaces:

- `aside "..."`
- `aside --session ...`
- `aside mcp`
- `aside repl`

The MCP example is a local stdio process using `command: "aside"` and `args: ["mcp"]`.

Source: https://docs.aside.com/help/developers

This public page does **not** document the remote/cloud endpoint, task API, authentication scheme, approval callback, or result API needed for a direct ChatGPT connector.

### Aside docs index

The current public Help Center index does not list dedicated pages for Channels, Cloud handoff, a remote task API, or an externally callable hosted Aside MCP.

Source: https://docs.aside.com/llms.txt

### Aside changelog

The official changelog includes `Device management`, described as showing active cloud devices and allowing a remote device to be signed out. It also documents profile routing, task approvals, and authenticated HTTP MCP connectors.

Source: https://docs.aside.com/changelog/components

`authenticated HTTP connectors` must not be interpreted as an Aside-hosted remote MCP without separate documentation; it may describe Aside acting as an MCP client.

## Registry check

A search of the HAPI MCP Registry for `aside` returned no publicly registered Aside server on 2026-09-12.

This does not disprove Aside remote execution because the official pricing page advertises remote/cloud capabilities, but it means a public registry URL cannot currently be used as the connector endpoint.

## Capability matrix

| Capability | Status | Evidence |
| --- | --- | --- |
| Aside performs browser-agent work | VERIFIED | Official product + developer docs |
| Channels / remote control | VERIFIED PRODUCT FEATURE | Official pricing |
| Cloud handoff | VERIFIED PRODUCT FEATURE | Official pricing |
| Start browser-agent runs from app/cron/internal tools | VERIFIED PRODUCT FEATURE | Official pricing, team/contact-sales |
| Cloud device concept | VERIFIED | Official changelog |
| Local CLI / MCP / REPL | VERIFIED | Public developer docs |
| Public remote HTTP task endpoint | NOT PUBLICLY VERIFIED | Not present in public docs index |
| Public hosted Aside MCP endpoint | NOT PUBLICLY VERIFIED | No public docs; HAPI registry search empty |
| OAuth/authentication contract for external task submission | NOT PUBLICLY VERIFIED | No public contract found |
| Remote task-status API | NOT PUBLICLY VERIFIED | No public contract found |
| Remote approval/resume API | NOT PUBLICLY VERIFIED | No public contract found |
| Remote screenshot/result API | NOT PUBLICLY VERIFIED | No public contract found |
| Direct ChatGPT Plugin -> Aside Remote wiring | BLOCKED ON OFFICIAL ACCESS CONTRACT | Must not invent endpoints |

## Required official contract

To activate the thin connector we need only the supported Aside integration surface, not a new browser runtime. The minimum contract is:

1. Official remote task-submission entry point.
2. Supported authentication / OAuth mechanism.
3. Task/run identifier and status lookup or event stream.
4. Follow-up / steering or continuation method.
5. Approval-required event and approve/deny/resume flow.
6. Result retrieval, including links/screenshots/artifacts where supported.
7. Clarification whether Pro `Channels` can receive programmatic requests from ChatGPT or whether the team/API offering is required.
8. Clarification whether `Cloud handoff` can create/continue a browser run with no local device online.

## Architecture decision

Aside Remote is the **primary target provider**.

ChatGPT Work's native cloud browser may remain documented as a fallback/research path, but using it does not count as ASIDE-GPT success because the browser execution would not be performed by Aside.

No fake `ASIDE_REMOTE_URL`, undocumented endpoint, reverse-engineered private API, cookie extraction, or credential relay should be added.

## Completion boundary

The 2026-09-12 [open-source fusion review](OPEN_SOURCE_FUSION.md) retains the
**NOT PUBLICLY VERIFIED** verdict. XState, Zod and SQLite now implement the local
state of a future cloud connector; they do not establish an Aside hosted API.
The runtime requires no user PC but is not yet a deployed mobile service.

The repository can be completed up to the official integration boundary now: provider policy, capability detection, schemas, approvals, evidence requirements, docs, tests, and an access-request checklist.

Actual end-to-end Aside execution can only be enabled when the official remote integration contract is supplied by Aside or becomes publicly documented.
