# Aside provider

Aside Remote is the **primary target provider** for ASIDE-GPT.

The official Aside pricing page verifies product-level remote/cloud capabilities:

- `Channels (Remote control)`
- `Cloud handoff`
- team/contact-sales support for starting browser-agent runs from an app, cron jobs, or internal tools

The official changelog also refers to active cloud devices.

The public developer docs currently document local CLI/MCP/REPL usage but do not publish the external remote task endpoint, authentication contract, task-status schema, approval/resume protocol, or result/artifact contract.

Therefore this provider is not `unsupported`; it is **officially supported at the product level but awaiting the documented/granted external integration contract**.

ASIDE-GPT must not invent an Aside cloud URL or reverse engineer private endpoints. Once official access is available, this folder should contain only a thin connector for task submission, status, continuation, approvals, and results. Browser execution remains Aside's responsibility.

See:

- `REMOTE_CAPABILITIES.md`
- `../../docs/ASIDE_REMOTE_FEASIBILITY.md`
- `../../docs/ASIDE_ACCESS_REQUEST.md`
- `../../docs/REMOTE_ACTIVATION_CHECKLIST.md`
