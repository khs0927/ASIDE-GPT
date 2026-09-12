# Aside provider

Aside is the **primary browser provider** for ASIDE-GPT.

## Status

Official product capability is confirmed: Aside's pricing advertises Channels (Remote control), Cloud handoff, and browser-agent runs started from apps, cron jobs, or internal tools.

The remaining gap is the public integration contract. The public Help Center currently documents local CLI/MCP/REPL usage but does not publish a generic third-party remote endpoint/auth/schema that this repository can safely hard-code.

Therefore this provider is `commercial-capability-confirmed` but not directly callable until an official account-authorized surface is available.

## Required contract for a direct adapter

A supported adapter may be implemented when Aside provides one of the following official forms:

- Remote MCP / Streamable HTTP endpoint, or
- REST/SDK task API, or
- an officially documented Channels/Cloud Handoff integration contract, or
- an account-specific developer/enterprise endpoint supplied by Aside.

The minimum contract needs task submission, task status, approval/input relay, continuation/cancel, result/artifact retrieval, and official authentication.

## Safety invariant

Never reverse-engineer private endpoints, paste user cookies/tokens into chat, invent an Aside URL, or silently route an Aside request through Work Browser. If official Aside remote access is not connected, return a blocked/access-required state. Work Browser is allowed only after explicit user opt-in as a non-Aside fallback.
