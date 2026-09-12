# Aside PC-Free Remote Execution Feasibility

**Review date:** 2026-09-12  
**Scope:** Officially supported execution of the existing Aside Browser Agent from a mobile ChatGPT client, without an Aside Browser, CLI, desktop, server, localhost bridge, or tunnel owned by the user.  
**Final verdict:** `UNSUPPORTED`

## Executive conclusion

The requested path is:

```text
ChatGPT Mobile
    -> ASIDE-GPT thin connector
    -> official Aside remote task interface
    -> Aside-hosted browser agent
```

That path is not supported by the current public Aside developer surface reviewed on 2026-09-12. The official material documents an installed Aside Browser and local developer entry points: the `aside` CLI, a command-based MCP integration, and the Aside browser REPL. The setup documentation requires installing Aside browser components, and the product describes tasks, memory, and data as running locally or staying on the device.

Aside does have cloud-related features, including cloud model access and encrypted data or browser-profile synchronization. Those are not evidence that the live browser agent and browser session execute on Aside infrastructure. No public, supported remote task submission, hosted-browser session, external approval callback, task-status event stream, result endpoint, OAuth integration for an external task client, HTTP MCP endpoint, or Streamable HTTP MCP endpoint was found in the official index, developer documentation, or changelog.

This is a product-integration verdict, not a claim that Aside has no private or internal service. An undocumented or private API cannot be used by ASIDE-GPT.

## Decision in the requested three-way form

This corresponds to the local-execution-required outcome:

> The current official Aside developer interface presupposes an installed Aside Browser and local execution. The PC-free external-client path cannot be used.

The repository verdict is therefore **`UNSUPPORTED` for the requested PC-free mobile ChatGPT integration**. If Aside later publishes a supported hosted runtime and external authorization contract, the verdict must be revisited from official documentation—not inferred from the word “cloud,” private network traffic, or an undocumented endpoint.

## Research method and official index

The complete public documentation index at [`docs.aside.com/llms.txt`](https://docs.aside.com/llms.txt) was enumerated first. The relevant product, developer, security, authentication, automation, and changelog pages were then inspected directly. The public product homepage and download flow were also checked.

The index surfaces reviewed were:

- Get started and subscription management
- Browser basics, tasks, side panel, and Ultrabrowse
- Routines / automation
- Memory
- Password Manager and password autofill
- AI providers
- Privacy and local data
- Agent permissions and security
- Troubleshooting and waiting-for-approval flows
- Developers: CLI, MCP, and REPL
- Components changelog and native-browser changelog

The review deliberately did not reverse engineer private endpoints, inspect unpublished app traffic, or treat a product UI link as a developer API.

## Official public interface inventory

| Surface | Officially documented interface | Where execution is anchored | PC-free external task path |
| --- | --- | --- | --- |
| Aside Browser | Download and install Aside, then start tasks from the browser or side panel | Installed Aside browser components and their browser profile | **No** |
| Natural-language tasks | Task composer in Aside; task modes include Default, Incognito, Read only, Guard, and Full access | Aside task and browser UI | **No external submission interface documented** |
| CLI task execution | `aside "..."` | A terminal with the local `aside` executable and Aside installation | **No** |
| Session continuation | `aside --session <session-id> "Continue"`; changelog also documents local session-resume commands | Local CLI / local Aside session context | **No** |
| Account commands | `aside account list`, `status`, `use`, and `--account` | Local CLI and the signed-in Aside installation | **No external account authorization contract documented** |
| MCP | `aside mcp`, launched from an `mcp.json` command entry such as `"command": "aside", "args": ["mcp"]` | A local process spawned by the MCP host | **No HTTP or Streamable HTTP endpoint documented** |
| Browser REPL | `aside repl "const p = await openTab(...)"` | Local Aside browser and local REPL process | **No** |
| Routines | Cron and heartbeat routines configured in `Settings > Routines` | Managed by the Aside product and its task/chat context | **No public routine API documented** |
| Approval and waiting states | Aside task UI can wait for approval, an answer, sign-in, MFA, CAPTCHA, or identity verification | Visible Aside task/browser surface | **No external mobile relay or callback documented** |
| Password Manager | Secure autofill; agent does not receive the raw password | Aside’s credential and browser-profile controls; sensitive steps remain user-mediated | **No** |
| AI providers | Aside cloud account for built-in models, connected subscriptions, or user API keys | Model/provider service, separate from browser hosting | **Not browser execution** |
| Memory and browser sync | History, cookies, bookmarks, password-vault data, and related settings can sync or be retained according to product controls | Data/profile synchronization | **Not live hosted-browser execution** |
| Shared session | Public read-only snapshot link for a session | Snapshot of a session, not a controllable live task endpoint | **No** |
| Web product / download | `aside.com` and `aside.com/download` | Product website and local app installation | **No task API exposed** |
| Developer API / OAuth / remote MCP / task API | No public entry was found in the complete index, developer page, or changelogs | Not specified | **Not publicly verified; do not implement** |

### CLI operation location

The official developer page describes installing the CLI from Aside developer settings and invoking tasks from a terminal. The same page uses local account commands and a local `--session` continuation. This is a developer surface around an installed Aside environment, not a hosted task queue reachable by a mobile client.

### MCP transport

The documented configuration starts the `aside` executable with the `mcp` argument from `mcp.json`. That is a command-based local process contract. The public documentation does not provide a remote MCP URL, bearer-token contract, OAuth flow for a remote Aside MCP server, webhook, HTTP transport, or Streamable HTTP transport.

### REPL operation location

The REPL examples open tabs and inspect pages directly through Aside browser primitives. This is a local browser-control surface. It is not a remote session protocol and does not provide task status, approval relay, or result retrieval for an external client.

### Routines execution location

Routines are configured inside Aside and can start a new task on a cron schedule or continue an existing chat through a heartbeat. The public documentation describes the product behavior and settings UI, but does not expose a routine-creation endpoint, external trigger, callback, or mobile-client API. A scheduled product feature must not be promoted to a public hosted-agent API without an explicit developer contract.

## Browser execution versus cloud-related features

The following distinction is central to this decision:

| Phrase or feature | What the official material supports | What it does **not** prove |
| --- | --- | --- |
| Aside cloud account / built-in models | Sign-in to an Aside account enables built-in model providers | That the browser agent runs in an Aside data-center session |
| Password-vault sync | Vault data can be encrypted before synchronization; saved password values remain protected from the agent | A hosted browser with a remotely attached credential vault |
| History, bookmark, cookie, or profile sync | Browser/profile continuity and data synchronization | Live remote navigation or remote task execution |
| Shared session link | A read-only snapshot of a session can be shared | External control of the session or task continuation |
| “Cloud” model/provider wording | Model inference or provider connectivity | Hosted browser tabs, a remote computer, or a public task queue |
| Aside Browser Agent | The product acts across websites, accounts, history, files, credentials, and approval boundaries | That an outside ChatGPT client can submit a task without running Aside locally |

The public homepage explicitly presents Aside as a browser and describes it as running on the user’s device, with local-by-default tasks, memory, and data. The setup path instructs the user to download and install the application. This is consistent with the CLI, MCP, REPL, local profile, and local approval surfaces documented above.

## Remote execution contract checklist

The following interfaces would be required before ASIDE-GPT could implement a thin adapter. None was publicly verified in the reviewed official material:

1. Official OAuth or account authorization for an external client
2. Remote task-submission endpoint with an explicit request schema
3. Aside-hosted browser session and isolated profile lifecycle
4. Task identifier, status, progress, and error/event retrieval
5. Secure sign-in and session-continuation semantics
6. Approval request and approval-result relay to the external client
7. Result, artifact, screenshot, and evidence retrieval endpoint
8. Remote MCP, HTTPS API, or another officially supported transport
9. Mobile-client support statement and supported authentication flow
10. Session retention, data residency, secrets handling, limits, and billing terms

Until those contracts are public and supported, ASIDE-GPT must not implement an endpoint-shaped placeholder, scrape a private web app, or claim that a Work cloud browser is an Aside provider.

## Requested success criteria

| # | Criterion | Status for the target architecture |
| ---: | --- | --- |
| 1 | The actual browser agent is Aside | **Only in the local product path; not proven for a remote path** |
| 2 | User PC/Mac count is zero | **No** |
| 3 | Local Aside Browser need not stay running | **No** |
| 4 | No localhost is needed | **Not publicly verified because no external route exists** |
| 5 | No personal server or tunnel is needed | **Not publicly verified because no external route exists** |
| 6 | A task can start from mobile ChatGPT | **Not publicly verified** |
| 7 | Aside account/session can be used through an official external flow | **Not publicly verified** |
| 8 | Aside approval can be relayed to mobile ChatGPT | **Not publicly verified** |
| 9 | Results can be returned to ChatGPT | **Not publicly verified** |
| 10 | The remote interface is officially supported | **No public interface found** |

The first criterion is decisive: replacing Aside with Work Cloud Browser would make the browser agent a different product and would not satisfy ASIDE-GPT’s purpose.

## Repository decision

No connector, browser engine, Playwright runtime, Computer Use implementation, Cloud Browser client, gateway, tunnel, or replacement orchestration engine is added as a result of this feasibility review.

- PR #3 (`refactor: make ASIDE-GPT mobile-only and cloud-browser native`) remains an unmerged research/fallback artifact. It is not the final ASIDE-GPT architecture.
- Work routing, approval, evidence, security, and OpenAI capability research from PR #3 may remain available for future fallback work, but it must not be described as an Aside integration.
- No `AsideCloud` adapter is implemented because no official hosted execution contract was verified.
- The only repository change for this phase is this documentation record, kept separate from PR #3.

## What would change the verdict

The verdict can move to `SUPPORTED` only after an official Aside source documents and makes available the remote contract listed above, and after a real end-to-end test demonstrates:

```text
Mobile ChatGPT
    -> ASIDE-GPT thin adapter
    -> official Aside authorization and task API/MCP
    -> Aside-hosted browser agent
    -> status / approval / result back to ChatGPT
```

The adapter should then remain limited to authentication, task submission, status, continuation, approval relay, result retrieval, and evidence forwarding. It must not contain its own browser agent or browser runtime.

## Official sources

- [Aside documentation index](https://docs.aside.com/llms.txt) — complete public page index used for discovery.
- [Aside Help Center](https://docs.aside.com/) — product documentation index and product description.
- [Get started](https://docs.aside.com/help/get-started) — installed browser components, supported setup, browser-data import, and first-task flow.
- [Developers](https://docs.aside.com/help/developers) — CLI, account commands, MCP command configuration, sessions, and REPL.
- [Run tasks](https://docs.aside.com/help/tasks) — task modes, browser actions, files, sign-in, approval, and follow-up behavior.
- [Automation / Routines](https://docs.aside.com/help/automation) — cron and heartbeat routines configured in Aside.
- [Password Manager](https://docs.aside.com/help/password-manager) and [passwords](https://docs.aside.com/help/passwords) — protected autofill and encrypted vault synchronization.
- [AI providers](https://docs.aside.com/help/ai) — cloud model/provider account behavior, distinct from browser hosting.
- [Privacy and local data](https://docs.aside.com/help/privacy) and [security](https://docs.aside.com/help/security) — local profile/data language, permissions, and approval boundaries.
- [Troubleshooting](https://docs.aside.com/help/troubleshooting) — waiting, approval, authentication, task, and artifact behavior.
- [Aside product homepage](https://aside.com/) and [download flow](https://aside.com/download) — browser product positioning and local application installation.
- [Components changelog](https://docs.aside.com/changelog/components) and [native-browser changelog](https://docs.aside.com/changelog/native) — current public feature history, including CLI, routines, sync, browser profiles, and read-only shared snapshots.

