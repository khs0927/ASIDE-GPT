# ADR-0001: Make the active architecture mobile-only and Work-native

- Status: accepted
- Date: 2026-09-12

## Context

The previous repository routed ChatGPT through a gateway to a persistent node that launched a local Aside CLI and browser. That requires a user-controlled machine and conflicts with the requirement that the user operate only from ChatGPT Mobile.

OpenAI’s current Work documentation describes cloud browser execution on a separate cloud computer, mobile task start, connected apps, secure sign-in, confirmation for consequential actions, and continuation when the user leaves. The current plugin documentation describes skills as workflow instructions and MCP as the interface for live data/actions. It does not require a plugin to expose a private cloud-browser API.

The official Aside developer documentation reviewed for this migration describes local CLI/MCP/REPL workflows. No public Aside hosted-browser execution API was verified.

## Decision

ChatGPT Work is the orchestrator and its native cloud browser is the default browser provider. ASIDE-GPT is a skills, policy, routing, approval, evidence, and schema package. Connected apps are preferred for structured service operations. Aside is an optional future provider with no implementation until a public hosted runtime is documented.

The old gateway/node code is moved under `legacy/local-node/`, removed from active workspaces and CI, and retained for historical reference.

## Consequences

Users do not need a PC, local browser, local CLI, home server, tunnel, or desktop daemon. Work and account rollout remain prerequisites, and tasks can still pause for sign-in, approval, site compatibility, or other user decisions. Browser execution is intentionally not independently testable from this repository; policy, routing, and evidence behavior are tested locally.
