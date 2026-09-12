# ADR-0002: Official Aside Remote is the primary execution provider

- Status: accepted
- Date: 2026-09-12
- Supersedes: ADR-0001 for the primary-provider decision

## Context

ADR-0001 moved the active architecture away from a required local PC and selected ChatGPT Work's native cloud browser as the execution path. That correctly solved the no-PC constraint, but it changed the product: Aside no longer performed browser execution.

Subsequent research found stronger official Aside evidence that was not incorporated into ADR-0001:

- Aside Pro advertises `Channels (Remote control)`.
- Aside Pro advertises `Cloud handoff`.
- Aside's team/contact-sales offering advertises starting browser-agent runs from an app, cron jobs, or internal tools.
- Aside's official changelog includes active cloud-device management.

At the same time, the currently indexed public developer documentation still exposes local CLI/MCP/REPL examples and does not publish the external remote task endpoint, authentication, status, approval, or result schema.

## Decision

The primary target provider is `aside-remote`.

ASIDE-GPT will stop at an explicit `official-aside-access-required` boundary until Aside publishes or grants the supported remote integration contract. It will not invent or reverse engineer that contract.

ChatGPT Work's native cloud browser remains an optional, explicitly selected non-Aside fallback. Its execution does not satisfy the ASIDE-GPT success criterion.

## Consequences

- No user PC/local Aside process is reintroduced.
- No replacement browser engine is built.
- Provider policy reflects official Aside product capability even before the public integration schema is available.
- The final network adapter can remain very small when access is granted.
- End-to-end no-PC execution cannot be truthfully claimed until the official Aside contract is activated and smoke-tested.
