# Mobile-only contract

The supported user path is:

`ChatGPT Mobile → ChatGPT Work → connected app and/or native Work cloud browser → remote service`

The following are not prerequisites:

- user PC, Mac mini, Windows machine, Raspberry Pi, or home server;
- local Chrome, Playwright, browser extension, or desktop app;
- local Aside CLI, node daemon, gateway, heartbeat, port forwarding, or tunnel;
- `ASIDE_GPT_NODE_SECRET` or any other local-node environment variable.

The phone is the place where the user starts the request and handles decisions. Work’s cloud execution may continue when the app or phone is closed if the host product supports continuation for that task. Work can still pause for sign-in, MFA, CAPTCHA, permission review, approval, or a site compatibility issue; those are user-facing pauses, not reasons to install a PC node.

This package cannot grant access to Work, connected apps, websites, or account features. The user must use the supported Work/plugin installation flow, authorize the desired apps, and complete secure sign-in when Work requests it.
