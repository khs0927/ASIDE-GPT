# ASIDE-GPT

Mobile-first browser automation for ChatGPT, powered by a trusted Aside execution node.

## Goal

Use **ChatGPT on mobile as the control surface** for browser automation. The phone never needs to run a browser automation engine or a local MCP process. ChatGPT calls a remote MCP gateway; a trusted execution node with the Aside CLI/browser installed performs the work and returns the result.

```text
ChatGPT mobile
      |
      | HTTPS / MCP
      v
ASIDE-GPT Gateway
      |
      | outbound-safe task channel
      v
ASIDE-GPT Node Agent
      |
      | local CLI
      v
Aside CLI + Aside Browser
      |
      v
Logged-in websites
```

## Why this architecture

`aside mcp` is a local stdio MCP surface. A mobile ChatGPT client cannot spawn that process on another machine. ASIDE-GPT therefore separates the public ChatGPT-facing MCP endpoint from the private machine that owns the browser session.

The node agent only makes outbound HTTPS requests to the gateway, so the machine running Aside does not need an inbound port or router configuration.

## MVP scope

- Remote MCP endpoint for ChatGPT
- `browser_run_task` for agentic browser work
- `browser_continue_task` for continuing an Aside session
- `browser_node_status` for checking whether a trusted execution node is online
- Outbound-polling node agent that invokes the local Aside CLI
- Shared-secret authentication between gateway and node
- Conservative timeouts and redacted logs
- No credential/cookie extraction APIs
- No raw arbitrary shell tool exposed to ChatGPT

## Security boundary

ASIDE-GPT does **not** bypass Aside's own confirmation or credential protections. Sensitive actions such as payments, posts, messages, account/security changes, and other consequential actions must remain approval-gated by the execution environment.

Do not expose cookies, passwords, passkeys, browser-profile files, or raw credentials through MCP tool results.

## Repository layout

```text
apps/
  gateway/    Remote MCP + task broker
  node/       Trusted node agent that runs Aside locally
docs/
  ARCHITECTURE.md
```

## Quick start (development)

```bash
npm install
cp .env.example .env
npm run dev:gateway
# in another terminal on the machine that has Aside installed
npm run dev:node
```

The gateway is designed to be exposed through HTTPS and connected to ChatGPT as a remote MCP server. For production, put it behind TLS and replace the MVP in-memory broker with a durable store before relying on long-running tasks.

## Development status

Initial mobile-first scaffold. The first implementation targets one persistent gateway process and one trusted Aside node. Durable queues, multi-node routing, OAuth and deployment automation follow after the local Aside CLI contract is smoke-tested.

## Upstream

ASIDE-GPT is an independent integration project. Aside is a separate product/service. This project uses its documented developer surfaces (CLI/MCP/REPL) rather than copying the proprietary Aside browser implementation.
