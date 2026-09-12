# Plugin package

This is currently a skills/policy package for connecting mobile ChatGPT workflows to the **official Aside remote browser-agent surface** when that surface is available to the user's account.

It intentionally declares no fabricated MCP endpoint. The public Aside docs reviewed for this repository do not currently publish the generic remote URL/auth/schema for the commercial Channels / Cloud handoff / external agent-run capabilities.

The skills enforce these rules:

- Aside is the primary browser provider.
- A browser task runs through Aside only when an official authorized remote surface is actually connected.
- Missing Aside access produces an explicit blocked/access-required state.
- Work Browser or another provider is used only after explicit user opt-in as a non-Aside fallback.
- Credentials and private endpoints are never invented or collected through chat.

When Aside exposes an official remote MCP/API/Channel contract suitable for third-party clients, the plugin can add the thin live-action connector without changing the provider policy.
