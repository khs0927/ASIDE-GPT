# Mobile-only contract

The target user path is:

`ChatGPT Mobile → ASIDE-GPT → official Aside remote surface → Aside Browser Agent → remote service`

ChatGPT Work may host/orchestrate the conversation, but its own browser is not the default Aside execution path.

The following are not prerequisites for the target architecture:

- user PC, Mac mini, Windows machine, Raspberry Pi, or home server;
- local Chrome, Playwright, browser extension, or desktop daemon;
- local Aside CLI, node daemon, gateway, heartbeat, port forwarding, or tunnel;
- `ASIDE_GPT_NODE_SECRET` or any other local-node environment variable.

Official Aside product material confirms remote-control/cloud-handoff and externally triggered browser-agent capabilities. The remaining integration dependency is an official authorized callable surface for the user's account. Until that is connected, the correct state is `access required`.

If the user explicitly opts into a non-Aside fallback, ChatGPT Work's native browser may be used and must be identified as the actual execution provider. It must never be represented as an Aside run.

Authentication, MFA, CAPTCHA, passkeys, and consequential-action approvals must use supported secure product flows. Secrets must not be pasted into chat.
