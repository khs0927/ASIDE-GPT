# Aside capability research

Reviewed on 2026-09-12 using Aside's official site, Help Center, changelog, pricing page, HAPI MCP Registry, and additional web discovery.

## Public developer surface

The official [developer documentation](https://docs.aside.com/help/developers) documents:

- `aside "..."` browser-agent tasks;
- `aside --session ...` continuation;
- `aside mcp` as a local stdio MCP server;
- `aside repl` for direct browser automation.

These interfaces use the installed Aside environment and do not themselves prove a PC-free remote connector.

## Official remote/cloud product evidence

The official [pricing page](https://aside.com/pricing) currently advertises:

- **Channels (Remote control)** on Pro;
- **Cloud handoff** on Pro;
- on the team/contact-sales offering, the ability to **start browser agent runs from your app, cron jobs, or internal tools**;
- controls for shared profiles, browser state, vaults, and approved team logins.

The official [component changelog](https://docs.aside.com/changelog/components) also includes a device-management feature that shows **active cloud devices** and allows a remote device to be signed out.

Therefore the earlier blanket conclusion that Aside has no PC-free remote/cloud capability is no longer correct.

## What remains unpublished in the indexed public docs

The current Help Center index at https://docs.aside.com/llms.txt does not expose a dedicated public contract for:

- remote task submission;
- the endpoint or hosted Remote MCP URL;
- OAuth/authentication scopes;
- task/run status;
- approval-required events and resume;
- result/screenshot/artifact retrieval;
- the exact developer surface behind app/cron/internal-tool triggered runs;
- whether `Cloud handoff` can create or continue a browser run while no user device is online.

A HAPI MCP Registry search for `aside` returned no public server entry on the review date. That does not contradict the pricing evidence; it only means a registry-discoverable remote MCP cannot currently be used as the connector.

## Decision

Aside Remote is the **primary target provider**.

Its correct current status is:

> official remote/cloud product capability verified; public external integration contract not yet verified.

ASIDE-GPT must not fabricate the missing contract. The project should stop at `official-aside-access-required` until the official API/SDK/Remote MCP/Channel access is published or granted.

Work-native browser execution remains an explicit non-Aside fallback and must not be reported as an Aside result.

See `ASIDE_REMOTE_FEASIBILITY.md` for the detailed matrix and `ASIDE_ACCESS_REQUEST.md` for the minimum information required to activate the final thin connector.
