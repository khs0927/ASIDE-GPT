---
name: aside-remote
description: Use when a user explicitly wants the official Aside browser agent to perform a browser task remotely from mobile ChatGPT without a user PC.
---

# Aside remote

## Purpose

Route browser automation to the official Aside remote/cloud product surface without reimplementing Aside or silently substituting another browser.

## Known capability boundary

Official Aside product material advertises Channels (Remote control), Cloud handoff, and browser-agent runs started from apps, cron jobs, or internal tools. The reviewed public developer documentation does not currently publish a generic third-party remote endpoint/auth/schema.

Treat this as `SUPPORTED-IN-PRODUCT / PUBLIC-CONTRACT-NOT-PUBLISHED` unless an official callable surface is actually connected in the current environment.

## Execution gate

Before executing a browser task:

1. Determine whether an official Aside remote surface is available and authorized in the current environment/account.
2. If yes, use that surface and identify Aside as the execution provider.
3. If no, do not fabricate an API URL, OAuth flow, token format, Remote MCP server, or private endpoint.
4. Return an access-required state describing the official connection capability that is missing.
5. Do not use Work Browser, Playwright, Computer Use, or another browser as a substitute unless the user explicitly authorizes a non-Aside fallback.

## Minimum adapter lifecycle

A direct Aside adapter should remain thin and map only the official contract needed for:

- submit browser-agent task
- read task/session state
- relay approval or user input
- continue/cancel a run
- retrieve result, links, screenshots, or files

The adapter must not implement its own browser automation engine.

## Approvals and credentials

- Preserve Aside's own approval boundary for payments, messages, posts, account/security changes, and other consequential actions.
- Never ask the user to paste passwords, OTPs, cookies, session tokens, API secrets, card data, or recovery codes into chat.
- Use only official authentication/authorization mechanisms supplied by Aside.

## Evidence

When a run completes, state that Aside performed the browser execution and return available task/session identifiers, final URL, page title, key values, actions, approval state, screenshots/files/source links, and timestamp when the official interface exposes them.
