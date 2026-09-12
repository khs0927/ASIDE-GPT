# ADR-0001: Make the active architecture mobile-only and Work-native

- Status: **superseded by ADR-0002**
- Date: 2026-09-12

## Context

The previous repository routed ChatGPT through a gateway to a persistent node that launched a local Aside CLI and browser. That required a user-controlled machine and conflicted with the requirement that the user operate only from ChatGPT Mobile.

This ADR correctly established the no-PC invariant and explored ChatGPT Work's native cloud browser as a technically valid mobile-only execution path.

At the time of the decision, the research set focused on Aside's public CLI/MCP/REPL developer docs and did not incorporate the stronger official pricing evidence for `Channels (Remote control)`, `Cloud handoff`, and team browser-agent runs triggered from apps, cron jobs, or internal tools.

## Original decision

The original decision selected ChatGPT Work and its native cloud browser as the default provider and treated Aside as an optional future provider.

## Supersession

ADR-0002 supersedes only the **primary-provider** portion of this decision.

The following conclusions remain valid:

- no user PC/local browser/local CLI should be required by the target product;
- the old local gateway/node prototype remains legacy only;
- undocumented APIs must not be invented;
- safety, approval, evidence, and prompt-injection policies remain useful.

The final primary target is now official Aside Remote. Work-native remains an explicit non-Aside fallback and research artifact.
