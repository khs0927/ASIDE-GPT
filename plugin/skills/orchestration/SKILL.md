---
name: orchestration
description: Coordinate a mobile ChatGPT browser task across planning, official Aside execution, durable state, confirmation, recovery, and evidence without silently changing providers.
---

# Orchestration

## Goal

Run browser work as a controlled state machine rather than a single opaque tool call. The browser executor is Aside when the project goal requires Aside. Planning, approval, recovery, and evidence remain separate stages.

## Order of operations

1. Classify the user request as read, write, or external effect.
2. Resolve the browser provider. Prefer an authorized official Aside remote adapter.
3. If no official Aside adapter is connected, stop with `official-aside-access-required` unless the user explicitly allowed a non-Aside fallback.
4. Create one durable run and one stable request key.
5. Dispatch once. If the submission outcome is ambiguous, mark the run uncertain and reconcile by lookup; never automatically resubmit.
6. Synchronize provider status into the durable run state.
7. For a consequential action, preserve the provider confirmation boundary and bind approval to the exact canonical action and expiry.
8. Resume only after provider acknowledgement of the approved action.
9. Verify the final provider run ID and evidence before claiming completion.

## Provider isolation

- Do not let Playwright, Work Browser, Computer Use, or another browser masquerade as Aside.
- A user-approved fallback must be labeled as non-Aside execution.
- Do not share a write-capable browser session between competing executors.
- Do not infer an official endpoint, token format, OAuth flow, webhook signature, or Remote MCP URL.

## Recovery

A timeout does not prove that the remote provider did nothing. Treat it as ambiguous delivery. Reconcile using an official lookup/idempotency surface when available. If the provider cannot support safe lookup, keep the task uncertain and require operator/provider resolution instead of resubmitting.

## Credentials and confirmation

Sign-in must happen in the official secure Aside authorization interface. Never collect passwords, OTPs, cookies, passkeys, recovery codes, card data, or vault secrets in chat. Approval and confirmation for external effects must remain explicit and scoped to the exact action.

## Completion evidence

A successful Aside run should bind the connector run to the provider task ID and include the final URL plus useful returned artifacts such as screenshots, files, source links, or structured values when the official contract exposes them. Missing or mismatched evidence is not success.
