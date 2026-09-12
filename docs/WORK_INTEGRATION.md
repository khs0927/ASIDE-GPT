# ChatGPT Work integration

## Role of Work

ChatGPT Work may serve as the conversational/orchestration surface, but **Work's native cloud browser is not the primary browser provider for ASIDE-GPT**.

For browser automation, the target provider is the official Aside remote browser-agent surface. Work may help select tools, carry the conversation, request approvals, and present results, but it must not silently replace Aside with its own browser and report the task as an Aside run.

## Expected routing

- Non-browser structured work may use a matching connected app directly.
- Browser automation should use an officially connected/authorized Aside remote surface.
- If Aside remote is not connected, return an access-required state rather than inventing an endpoint.
- Work's native browser may be used only when the user explicitly allows a non-Aside fallback.
- Hybrid workflows may combine a connected app with Aside when the browser portion is actually executed by Aside.

## Authentication

Use only official OAuth/account/remote authorization flows exposed by the relevant service. Never request passwords, OTPs, cookies, bearer tokens, API secrets, or card data in chat.

## Mobile target

The target user experience is:

`ChatGPT Mobile → ASIDE-GPT routing/policy → official Aside remote → Aside Browser Agent → website`

No user PC, local Aside CLI, localhost bridge, personal tunnel, or desktop daemon is part of the target path.

## Current limitation

Aside's official pricing confirms remote-control/cloud-handoff and externally triggered browser-agent capabilities, but the reviewed public Help Center does not publish the generic third-party endpoint/auth/schema required to wire that live connector in this repository today. Until an official callable surface is authorized, the correct state is `access required`, not `unsupported` and not automatic Work-browser substitution.
