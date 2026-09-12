# ADR-0002: Aside remote first

- Status: accepted
- Date: 2026-09-12

## Context

The product goal is not to build a new browser automation engine. The goal is to use the official Aside browser agent from mobile ChatGPT without requiring the user's PC.

Current official Aside product material confirms remote/cloud capability through `Channels (Remote control)`, `Cloud handoff`, and browser-agent runs started from apps, cron jobs, or internal tools. The public Help Center still documents only the local CLI/stdin-stdout MCP/REPL developer surface and does not publish the generic remote endpoint/auth/schema required for a third-party direct client.

## Decision

`aside-official-remote` is the primary browser provider.

ASIDE-GPT is a thin connector/policy layer. It may integrate only through an official Aside remote surface supplied by the product or the user's authorized account.

When an official Aside remote surface is connected, real browser execution must be performed by Aside. When it is not connected, the browser task is blocked and the missing official access is reported. ChatGPT Work's native browser is a non-Aside fallback only after explicit user opt-in.

## Invariants

- No user PC, local Aside CLI, localhost bridge, personal tunnel, or desktop daemon is required by the target path.
- Do not reverse-engineer private Aside endpoints.
- Do not invent an OAuth flow, API URL, token format, or Remote MCP URL.
- Do not silently substitute Work Browser or another provider and report the result as Aside.
- Preserve Aside/host approval boundaries for consequential actions.
- Report the actual execution provider in evidence.

## Adapter gate

A direct adapter can be implemented once Aside provides an official contract with enough of the following to complete a run lifecycle:

- account authorization/authentication
- task submission
- task state/status
- approval or user-input relay
- continuation/cancellation
- result and artifact/screenshot retrieval

The adapter should remain transport-thin; it must not implement browser automation itself.
