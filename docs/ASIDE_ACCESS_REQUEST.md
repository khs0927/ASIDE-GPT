# Aside Remote Access Request

ASIDE-GPT does not need a new browser engine. It needs the supported control-plane contract for Aside's already-advertised remote/cloud features.

Official product evidence currently confirms `Channels (Remote control)`, `Cloud handoff`, and browser-agent runs triggered from an app, cron job, or internal tool. Public developer docs do not currently publish the integration contract needed to call those capabilities from ChatGPT.

## Request to Aside

Please provide the official supported integration method for these capabilities:

1. Start a new browser-agent run remotely with an instruction.
2. Run that browser task on Aside-managed/cloud execution without a user's Mac/PC remaining online.
3. Read run state: queued, running, waiting, failed, completed.
4. Send a follow-up / steer / continue message to an existing run.
5. Receive an approval-required event and approve or deny from a remote client.
6. Retrieve final output, URLs, screenshots, downloads, and other task artifacts when supported.
7. Authenticate an external client using the supported account/team identity method (OAuth preferred where available).
8. Revoke access and enumerate active remote/cloud devices or sessions.
9. Clarify whether Pro `Channels (Remote control)` is an API/channel that an external ChatGPT integration can use.
10. Clarify whether `Cloud handoff` can start or continue a browser-agent run when no local Aside Browser is running.
11. Clarify whether the team feature described as `Start browser agent runs from your app, cron jobs, or internal tools` has API, SDK, webhook, MCP, A2A, or other developer documentation.

## Acceptable official surfaces

Any officially supported surface is suitable:

- Remote Streamable HTTP MCP
- REST/JSON API
- SDK
- A2A endpoint
- webhook + task API
- documented Channel transport
- another officially supported protocol

ASIDE-GPT will adapt to the supported contract rather than requiring a specific protocol.

## Security requirements

ASIDE-GPT will not request or transport browser cookies, passwords, passkeys, OTP seeds, raw vault data, or private browser-profile files. Sensitive actions must preserve Aside's own approval boundary.

Do not send credentials in a GitHub issue. Configure credentials only through the official Aside/ChatGPT authorization surface once the integration method is known.

## Intended topology

```text
ChatGPT Mobile
        |
        v
ASIDE-GPT thin connector
        |
        v
official Aside remote control plane
        |
        v
Aside Browser Agent / cloud execution
        |
        v
websites
```

The connector should perform request translation, task status, follow-up, approvals, and result forwarding only. Browser execution remains Aside's responsibility.
