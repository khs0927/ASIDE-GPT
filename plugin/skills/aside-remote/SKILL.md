---
name: aside-remote
description: Use when a user explicitly wants the official Aside Browser Agent to perform a browser task remotely from mobile ChatGPT without a user PC.
---

# Aside remote

## Goal

Use the official Aside remote/cloud control surface so the actual browser work is performed by Aside. Do not reimplement Aside and do not silently substitute another browser.

## Capability boundary

Official Aside product material advertises Channels (Remote control), Cloud handoff, and browser-agent runs started from apps, cron jobs, or internal tools. The reviewed public developer documentation does not currently publish a generic third-party remote endpoint/auth/schema.

Treat the current state as `official-aside-access-required` unless an official callable surface is actually connected and authorized.

## Execution gate

1. Determine whether an official Aside remote surface is available and authorized in the current environment/account.
2. If yes, use it and identify Aside as the execution provider.
3. If no, do not fabricate an API URL, OAuth flow, token format, Remote MCP server, or private endpoint.
4. Report `official-aside-access-required` and use the access request/checklist documents to describe the missing official contract.
5. Do not use Work Browser, Playwright, Computer Use, or another browser as a substitute unless the user explicitly authorizes a non-Aside fallback.

## Adapter lifecycle

The connector may only map the official contract needed to:

- submit a browser-agent task;
- read task/session status;
- relay a follow-up, approval, confirmation, rejection, or user answer;
- continue or cancel a run;
- retrieve results, URLs, screenshots, files, and other artifacts.

The connector must not implement its own browser automation engine.

## Credentials and confirmation

- Preserve Aside's own approval and confirmation boundary for payments, messages, posts, account/security changes, and other consequential actions.
- Resume after a confirmation request only through the supported official flow.
- Never ask the user to paste passwords, OTPs, cookies, session tokens, API secrets, card data, or recovery codes into chat.
- Use only official authentication/authorization mechanisms supplied by Aside.

## Evidence

When a run completes, state that Aside performed the browser execution and return the available task/session identifiers, final URL, page title, key values, actions, approval state, screenshots/files/source links, and timestamp when the official interface exposes them.
