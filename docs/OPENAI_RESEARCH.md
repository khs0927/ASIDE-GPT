# OpenAI capability research

Reviewed on 2026-09-12 using the official OpenAI documentation available at the time of this migration.

## Findings

- [Browser and cloud browser](https://learn.chatgpt.com/docs/browser): Work can use a browser on a separate cloud computer, can be started from mobile, can use connected apps or the browser based on the request, and can continue when the user is away when the task supports it. The page also describes secure sign-in, confirmation for consequential actions, and the fact that the cloud session is separate from the device browser.
- [Plugins](https://learn.chatgpt.com/docs/plugins): plugins can bundle skills and MCP integrations, and can be used in ChatGPT mobile when the plugin supports the platform. MCP tools are appropriate for structured data and supported actions; browser execution remains a host-product capability.
- [MCP server concepts](https://developers.openai.com/plugins/concepts/mcp-server): an MCP server is optional and connects a plugin to live data, tools, resources, or prompts. A skills-only package is valid when its workflow can be supplied as instructions and does not need a custom live service.
- [Plugin skills](https://developers.openai.com/plugins/concepts/skills): a skill is a focused `SKILL.md` workflow with metadata and instructions; it should define inputs, steps, outputs, boundaries, and when to ask or stop.
- [Building an MCP server](https://developers.openai.com/plugins/build/mcp-server): if ASIDE-GPT later adds a live MCP service, it must use a supported SDK, accurate tool schemas, authorization, and structured output. This migration adds no live MCP service because the browser provider is native to Work.

## Design consequence

The repository does not implement `CloudBrowser API`, `work_browser_*`, a proxy to a user machine, or a made-up plugin call. It provides the Work-facing skills and deterministic policy helpers that can be exercised in tests without pretending to control a browser outside Work.
