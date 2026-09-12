# Aside capability research

Reviewed on 2026-09-12 using Aside’s public developer documentation.

The [Aside developer documentation](https://docs.aside.com/help/developers) documents the Aside CLI, browser automation tasks, local MCP invocation (`aside mcp`), and a local browser automation REPL (`aside repl`). The [task documentation](https://docs.aside.com/help/tasks) describes browser tasks, approvals, and local context. These materials are useful for understanding the prior implementation, but they do not verify a public hosted-browser execution API or a cloud session API that removes the user-device requirement.

Decision: Aside is `optional future provider`. No Aside cloud URL, token, SDK, browser client, or adapter is implemented. If Aside later publishes a supported hosted runtime, it must be evaluated separately for authentication, session ownership, user approval, data residency, pricing, and mobile-only execution before adding a provider adapter.
