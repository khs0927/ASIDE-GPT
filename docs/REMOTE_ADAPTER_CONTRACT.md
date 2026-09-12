# Remote adapter contract

This document defines the minimum internal interface ASIDE-GPT expects from an **official Aside remote integration**. It does not claim that these HTTP endpoints or method names exist in Aside.

The matching TypeScript interface lives at `packages/providers/remote-contract.ts`.

## Required lifecycle

- submit a real Aside browser-agent task;
- read task/run state;
- relay follow-up, approval, rejection, confirmation, or user answers;
- continue or cancel a run;
- retrieve the final result and supported URLs/screenshots/files/artifacts.

## Authentication

Authentication is provider-supplied. The implementation may receive an opaque authorized client from the host runtime, but must never define a guessed Aside bearer-token format or ask the user to paste secrets into chat.

## Transport mapping

When Aside publishes or grants access to an official API, SDK, Remote MCP, Channel, Cloud Handoff, or equivalent surface, implement one thin adapter that maps the official schema to the internal types. Keep provider-specific fields at the boundary.

## Prohibited shortcuts

- no private endpoint reverse engineering;
- no browser automation engine inside the adapter;
- no local-PC bridge in the primary path;
- no provider fallback masquerading as Aside;
- no raw password, cookie, OTP, vault, or token relay through ChatGPT.
