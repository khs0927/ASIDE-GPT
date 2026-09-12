# Aside capability research

Reviewed on 2026-09-12 using Aside's official pricing, Help Center, changelog, policies, developer documentation, HAPI MCP Registry, and the ChatGPT Plugin Directory.

## Confirmed official capabilities

Aside's official pricing page advertises:

- `Channels (Remote control)` on Pro.
- `Cloud handoff` on Pro.
- Team-scale browser-agent runs started from an app, cron job, or internal tool.
- Shared browser/profile/vault controls for team use.

The Aside changelog also documents account-level device management for active cloud devices.

These are enough to conclude that official remote/cloud product capability exists. The previous `UNSUPPORTED` / `optional future provider` wording was too strong.

## Public developer surface

The public developer documentation currently documents:

- `aside` / `aside exec` task invocation.
- account selection.
- `aside mcp` as a local stdio MCP server.
- `aside repl` browser automation.
- local browser/profile binding and approvals.

The public documentation index currently does **not** publish the remote endpoint, OAuth/client registration contract, Remote MCP URL, task API schema, task-status API, approval callback, or result/artifact endpoint required for a generic third-party client such as ASIDE-GPT to call the commercial remote capability directly.

HAPI MCP Registry returned no public Aside server entry, and the ChatGPT Plugin Directory did not expose an official Aside plugin in the checks performed for this repository.

## Verdict

`SUPPORTED-IN-PRODUCT / PUBLIC-CONTRACT-NOT-PUBLISHED`

This means:

1. Do not say Aside has no PC-free remote/cloud capability.
2. Do not claim a public callable API exists when its contract has not been published or authorized.
3. Keep Aside as the primary provider.
4. Block execution when no official remote surface is connected rather than silently substituting another browser.
5. Implement a thin adapter as soon as Aside exposes an authorized remote contract for the account.

See `ASIDE_REMOTE_FEASIBILITY.md` for the integration checklist and evidence boundary.
