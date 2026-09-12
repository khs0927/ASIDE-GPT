# Mobile ChatGPT Setup

This is the target operating model for ASIDE-GPT:

```text
phone: ChatGPT only
        |
        | HTTPS remote MCP
        v
public ASIDE-GPT /mcp endpoint
        |
        v
trusted always-on machine
  - ASIDE-GPT gateway
  - ASIDE-GPT node agent
  - Aside CLI / Aside Browser
  - logged-in browser accounts
```

After initial setup, normal browser work is initiated from the phone. You do not need to open a terminal for each task.

## 1. Prepare the trusted execution machine

Requirements:

- Node.js 22+
- Aside Browser installed and signed in
- Aside CLI available to the same logged-in user
- this repository checked out

Install and build:

```bash
npm install
npm run build
```

Confirm the Aside CLI first:

```bash
aside --version
```

## 2. Configure secrets

Create `.env` from `.env.example` and replace both placeholder secrets.

Use **different random values** for:

- `ASIDE_GPT_MCP_TOKEN`: only the ChatGPT/MCP connection gets this.
- `ASIDE_GPT_NODE_SECRET`: only the trusted execution node gets this.

For a single-machine setup, keep:

```text
ASIDE_GPT_GATEWAY_URL=http://localhost:8787
ASIDE_GPT_NODE_ID=primary
```

The default Aside invocation mode is `direct`, corresponding to the documented direct CLI style. If the installed CLI expects the `exec` subcommand, set:

```text
ASIDE_GPT_ASIDE_MODE=exec
```

## 3. Start the gateway and node

In separate processes under the same logged-in desktop user:

```bash
npm run dev:gateway
npm run dev:node
```

Production startup after `npm run build`:

```bash
npm run start -w @aside-gpt/gateway
npm run start -w @aside-gpt/node
```

Verify locally:

```text
http://localhost:8787/health
```

The node should then appear online through the MCP `browser_node_status` tool.

## 4. Give ChatGPT a public HTTPS MCP endpoint

ChatGPT must be able to reach the gateway over HTTPS. Do **not** port-forward the Aside browser, CDP port, or node agent.

For a personal single-machine deployment, an outbound HTTPS tunnel is the simplest pattern:

```text
Internet / ChatGPT
      |
      v
HTTPS tunnel
      |
      v
localhost:8787
```

A Cloudflare Tunnel, equivalent zero-trust tunnel, or a small persistent reverse proxy can expose only the gateway. The node remains private and outbound-only.

The remote MCP URL is:

```text
https://YOUR_DOMAIN/mcp
```

Authenticate the MCP connection with:

```text
Authorization: Bearer <ASIDE_GPT_MCP_TOKEN>
```

Do not use `ASIDE_GPT_NODE_SECRET` in ChatGPT.

## 5. Connect from ChatGPT

Register the HTTPS `/mcp` endpoint as the MCP server for an ASIDE-GPT custom Plugin/App connection. The tools exposed are:

- `browser_node_status`
- `browser_read_task`
- `browser_run_task`
- `browser_continue_task`

Once connected, the same plugin is available from the mobile ChatGPT client for normal use.

Example requests from the phone:

```text
ASIDE-GPT로 지금 로그인되어 있는 GitHub에서 내 저장소의 최근 Actions 실패 원인을 확인해줘.
```

```text
ASIDE-GPT로 이 사이트에 들어가서 폼을 작성해. 제출 직전에는 멈추고 나에게 알려줘.
```

```text
ASIDE-GPT로 어제 하던 브라우저 세션을 이어서 계속 진행해줘.
```

## Current limitation: sensitive approvals

Aside protects sensitive actions with its own permission/approval boundary. ASIDE-GPT intentionally does not bypass it.

The next protocol milestone is a `waiting_for_approval` state that can surface an Aside approval request back into ChatGPT mobile and resume after explicit user confirmation. That should be implemented only after the exact approval/event contract of the installed Aside CLI version is verified.

Until then, read-only work and browser actions that do not trigger an Aside-local approval can be completed fully from mobile. A task that requires an Aside-local approval may still pause on the execution machine.

## Recommended always-on deployment

For personal use, prefer one trusted logged-in desktop machine running:

1. Aside Browser
2. ASIDE-GPT gateway
3. ASIDE-GPT node agent
4. outbound HTTPS tunnel

This keeps browsing state and credentials on the machine where Aside already owns them while making ChatGPT mobile the day-to-day control surface.
