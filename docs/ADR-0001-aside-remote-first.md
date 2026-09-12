# ADR-0001: Aside remote first

- Status: accepted
- Date: 2026-09-12

## Context

The project goal is to use the official Aside Browser Agent from mobile ChatGPT without keeping a user's PC online. It is not to build a new browser automation engine.

Official Aside product material verifies remote/cloud capabilities through Channels (Remote control), Cloud handoff, and browser-agent runs triggered from apps, cron jobs, or internal tools. The reviewed public developer documentation does not yet publish the generic external endpoint/auth/schema required to call those commercial capabilities directly.

## Decision

Aside Remote is the primary target provider.

ASIDE-GPT remains a thin connector/policy layer. A browser task counts as ASIDE-GPT success only when Aside performs the actual browser execution.

If the official Aside remote contract is not connected, return `official-aside-access-required` rather than inventing an endpoint or silently switching to another browser. ChatGPT Work's native browser may be used only as an explicitly authorized non-Aside fallback and must be labeled accordingly.

## Invariants

- no user PC requirement in the target path;
- no local Aside CLI/localhost bridge/personal tunnel requirement;
- no reverse engineering of private Aside endpoints;
- no guessed OAuth, token, API, or Remote MCP contract;
- no silent provider substitution;
- preserve Aside/host confirmation boundaries for consequential actions;
- report the actual browser execution provider.

## Adapter gate

Implement the live adapter only when Aside publishes or grants an official contract sufficient for task submission, task state, follow-up/approval relay, cancellation/continuation, and result/artifact retrieval.
