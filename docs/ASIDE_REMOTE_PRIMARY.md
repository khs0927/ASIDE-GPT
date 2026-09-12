# ASIDE-GPT Primary Architecture

The product goal is not to build a new browser automation engine.

The primary target architecture is:

```text
Mobile ChatGPT
    -> ASIDE-GPT thin connector
    -> official Aside remote/cloud control plane
    -> Aside Browser Agent
    -> websites
```

## Success criterion

A browser task counts as ASIDE-GPT success only when the actual browser work is executed by Aside.

## What ASIDE-GPT may do

- translate ChatGPT requests into the official Aside task contract
- submit and identify runs
- poll or subscribe to status
- forward user steering/follow-ups
- relay approval requests and decisions
- return Aside results, screenshots, links, and artifacts
- enforce conservative safety/evidence policies around the connector

## What ASIDE-GPT must not do

- implement another browser agent
- reimplement Aside using Playwright
- silently replace Aside with ChatGPT Work Cloud Browser
- reverse engineer private Aside APIs
- extract cookies or browser credentials
- invent an endpoint or authentication method

## Current activation state

Official Aside pricing verifies remote/cloud product capability, including Channels (Remote control), Cloud handoff, and team browser-agent runs started from apps, cron jobs, or internal tools.

The public developer docs currently expose the local CLI/MCP/REPL contract but not the remote/cloud API contract. Therefore the integration is architecturally ready but cannot truthfully perform a remote call until Aside provides or publishes the supported contract.

See:

- `docs/ASIDE_REMOTE_FEASIBILITY.md`
- `docs/ASIDE_ACCESS_REQUEST.md`
- `providers/aside/REMOTE_CAPABILITIES.md`
