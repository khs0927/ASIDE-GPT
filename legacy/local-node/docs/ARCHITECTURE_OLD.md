# ASIDE-GPT Architecture

## Product requirement

The user should be able to perform browser automation from **ChatGPT on a phone**. The phone is only the conversational control surface. Browser state, login state, automation binaries and credentials remain on a trusted execution node.

## Data path

```text
1. User speaks/types in ChatGPT mobile
2. ChatGPT calls https://<gateway>/mcp
3. MCP tool creates a browser task
4. Trusted node polls the gateway over outbound HTTPS
5. Node invokes Aside locally without a shell
6. Aside controls the logged-in browser
7. Node posts the task result back to the gateway
8. MCP tool returns the result to ChatGPT mobile
```

## Components

### Gateway

Public HTTPS service. Responsibilities:

- expose MCP tools to ChatGPT;
- authenticate MCP callers;
- authenticate trusted execution nodes;
- queue browser tasks;
- track node liveness;
- return browser results to the MCP caller.

The MVP uses an in-memory broker. That is intentional for the first executable slice, but it means the gateway must run as one persistent process. A production deployment should move tasks and node leases to a durable store (for example Postgres/Supabase or Redis) before horizontal scaling.

### Node agent

Runs on the machine that owns the Aside browser/session. Responsibilities:

- make outbound-only requests to the gateway;
- report liveness and Aside CLI version;
- claim work assigned to its node ID;
- invoke the Aside CLI with `execFile`, never via a shell command string;
- upload bounded output and status.

The node never opens a listening port.

### Aside

Aside remains the browser automation engine. ASIDE-GPT treats it as an external dependency and uses documented CLI/MCP developer surfaces. ASIDE-GPT must not extract credentials from Aside or bypass its sensitive-action approval boundaries.

## MCP tools

### `browser_node_status`

Read-only. Check whether an execution node is online.

### `browser_read_task`

Read-only browser research/inspection. ASIDE-GPT prepends a non-mutation policy to the task.

### `browser_run_task`

Interactive browser automation. Marked destructive/open-world conservatively because the prompt may result in external side effects.

### `browser_continue_task`

Continue an existing Aside session using its session ID.

## Mobile-first decisions

- No desktop control panel is required for ordinary use.
- No inbound port is required on the user's execution node.
- ChatGPT talks only to a normal HTTPS MCP endpoint.
- Long-term, mobile approval should be represented as an explicit task state so a pending sensitive action can be confirmed from ChatGPT rather than from the execution node display. This requires validating the installed Aside CLI approval/event contract first; the MVP does not fake or bypass it.

## Production roadmap

1. Smoke-test current Aside CLI command/output contracts on the target machine.
2. Add durable task storage and node leases.
3. Add encrypted per-node credentials and key rotation.
4. Add OAuth for ChatGPT-facing MCP access.
5. Add `waiting_for_approval` task state once Aside exposes a reliable approval event/continuation contract.
6. Add multi-node routing (home, office, cloud browser nodes).
7. Add audit log metadata without persisting sensitive page content by default.
8. Add optional non-Aside browser backend behind the same interface for environments where Aside cannot run.
