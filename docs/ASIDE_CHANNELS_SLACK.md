# Aside Channels over Slack

## Purpose

Use official Aside `Channels` as the mobile command transport so ChatGPT can control the official Aside Browser Agent without a custom private API.

```text
ChatGPT Mobile
  -> connected Slack plugin
  -> verified Slack conversation connected to Aside Channels
  -> official Aside session / Cloud handoff
  -> Aside Browser Agent
```

## Official basis

Aside's official product surfaces currently establish:

- Pro includes `Channels (Remote control)`.
- The 2026-08-04 component changelog describes Channels remote control over Slack and Telegram.
- The same changelog describes guided connection settings and durable delivery.
- Telegram receives session-control commands; Slack and Telegram are both official remote-control surfaces.
- Pro includes `Cloud handoff`.
- Aside also advertises team browser-agent runs started from apps, cron jobs, or internal tools.

Official references:

- https://aside.com/pricing
- https://docs.aside.com/changelog/components

## Why Slack is preferred for ASIDE-GPT

ChatGPT has a supported Slack connector that can send messages, read channels and threads, and return replies to the conversation. Therefore Slack can serve as the inter-product transport without ASIDE-GPT handling raw credentials or reverse engineering Aside's private control plane.

Telegram remains a valid official Aside Channel, but ASIDE-GPT should prefer Slack when ChatGPT has no directly supported Telegram messaging connector.

## One-time account setup

The user must use Aside's official UI to connect Channels to a Slack workspace/conversation according to the product's current flow.

ASIDE-GPT must not guess a destination from a channel name. A Slack conversation becomes usable only after it is proven to be the one connected to official Aside Channels.

No Slack token, Aside token, password, cookie, OTP, passkey, or vault secret belongs in source control or ChatGPT messages.

## ChatGPT host workflow

After the official Aside Channel is configured:

1. Discover the verified Slack conversation through the connected Slack plugin.
2. Send a harmless read-only Aside task.
3. Read the bot/channel response and, when applicable, its thread.
4. Keep follow-ups in the same Aside-linked conversation/thread where the Channel flow expects them.
5. If Aside requests approval or user input, show the exact request to the user in ChatGPT.
6. Relay an approval only after explicit confirmation from the user.
7. Continue reading the response until Aside reports a completed, failed, waiting, or user-action-required state.
8. Return the fact that the provider was `Aside via Channels/Slack` together with available URLs, values, screenshots/artifacts, and confirmation state.

## Required no-PC proof

Channels proves remote control; it does not by itself prove that browser execution survives with every local device offline.

Before ASIDE-GPT marks the path production-ready, perform this smoke test:

1. Ensure the Slack conversation is connected to official Aside Channels.
2. Ensure the intended Aside account/plan has `Cloud handoff` available.
3. Put all user-owned PC/Mac devices running Aside fully offline or stop the local Aside process.
4. From mobile ChatGPT, send a harmless read-only instruction through Slack, for example asking Aside to open a public page and report its title.
5. Verify Aside actually starts/continues the browser task and returns a result while no local user device is providing execution.
6. Record only non-sensitive evidence: timestamp, provider identity, Channel/thread reference, requested public URL, and returned public page title.
7. Repeat with a non-destructive task that triggers an approval or question, and prove the mobile round trip can resume the task.

Only then set the account-level state equivalent to `cloudNoPcExecutionLiveVerified=true`.

## Failure interpretation

- No verified Aside-linked Slack conversation: `aside-channel-setup-required`.
- Aside-linked Slack works only while a local Aside device is online: the user's PC-free requirement is not satisfied.
- Channel works but Cloud handoff cannot start/continue a new browser run with devices offline: keep `cloud-no-pc-execution-not-live-verified` and do not claim completion.
- Work native browser can complete the site task: this may be offered only as an explicit non-Aside fallback and does not count as ASIDE-GPT success.

## Direct API path

Aside's team pricing also advertises browser-agent runs started from apps, cron jobs, or internal tools. If an official API/SDK/Remote MCP contract is later published or granted, it can become an additional direct transport. It is not necessary to fabricate such an API while official Channels is available.
