# ChatGPT Mobile and Aside: official Secure MCP Tunnel

**Status: prepared, NOT live-connected.** This transport forwards the real official Aside stdio MCP server via [OpenAI tunnel-client](https://github.com/openai/tunnel-client). It does not emulate a browser or invent an Aside Cloud API.

## Verified infrastructure (2026-10-14)
- Jev implementation already exists in khs0927/ASIDE-GPT (packages/decisions/jev.ts) and khs0927/jev-browser-control-plane. Existing JEV Decision Gateway on Manufact has configured GitHub OAuth and TypeSafe credentials: do not duplicate or change production secrets.
- The khs0927/aside repository is empty. Keep ASIDE-GPT as the canonical Aside implementation.
- The connected Cloudflare account has mobile-work-gateway Worker; rhino-gpt-gateway Cloudflare Tunnel is down, and chatcmd-mobile-vps Tunnel has no active connections. These Cloudflare tunnel IDs are NOT OpenAI Secure MCP Tunnel IDs.
- DESKTOP-KTQHS1I was offline, so real Aside browser execution was not tested.
- Aside's public developer documentation supports local Windows/macOS CLI, stdio MCP, REPL, and login. A direct external Aside-hosted Cloud submit/status/auth API is not publicly documented; do not assert PC-free Aside execution.

## Immediate mobile user-interface path (Aside Windows/macOS executor must be online)

1. On a trusted Windows or macOS Aside machine, launch Aside Browser with its daemon and sign in using official Aside account settings. Do not extract or forward cookies, passwords, or the Aside Vault.
2. Install the official Aside CLI from https://docs.aside.com/help/developers . Verify Aside CLI version and account login on that machine.
3. Install the official OpenAI tunnel-client binary from https://github.com/openai/tunnel-client/releases/latest . Windows binaries are available; source build instructions are in its repository.
4. Create a tunnel in https://platform.openai.com/settings/organization/tunnels . Create a separate RUNTIME API key with Tunnels Read+Use at https://platform.openai.com/settings/organization/api-keys . Do not use the admin key in the daemon.
5. Set CONTROL_PLANE_TUNNEL_ID and CONTROL_PLANE_API_KEY in the execution host's private runtime environment. Optional: ASIDE_BIN and TUNNEL_CLIENT_BIN if the executables are not in PATH. Never place credentials in Git, shared folders, browser prompts, logs, or unencrypted deployment variables.
6. Use Node.js 22+ from this repository (run in this order, on the host running Aside):

    node scripts/aside-mobile-tunnel.mjs preflight
    node scripts/aside-mobile-tunnel.mjs init
    node scripts/aside-mobile-tunnel.mjs doctor
    node scripts/aside-mobile-tunnel.mjs run

7. When the official tunnel-client reports readiness and its /readyz endpoint is healthy, register the tunnel in ChatGPT settings → Plugins/Connectors. Verify MCP discovery, one read-only Aside action, then one explicit-approval non-destructive action. Do not infer browser readiness from plugin visibility alone.

The helper intentionally runs the tunnel-client in the FOREGROUND; it does not create a persistent OS service, persist secrets, or modify account permissions. For production keep the Aside browser alive and supervise the tunnel with the host's trusted service manager. Do not expose its health or administrative interface publicly.

## Truly PC-free Aside path: vendor contract required

Target:

ChatGPT iPhone → ASIDE-GPT policy and Jev → documented Aside-hosted Remote API → Aside cloud browser → independently verified result.

A Linux VPS can manage policy, queues, audited tasks, approvals, and existing Jev. That does NOT establish that an Aside Browser daemon runs headless on Linux. Only enable the Aside Cloud adapter after authorized official auth, submit, status, cancel, resume, approval, and artifact contracts are verified. Follow docs/ASIDE_REMOTE_FEASIBILITY.md and docs/REMOTE_ACTIVATION_CHECKLIST.md. Do not silently substitute ChatCMD, Playwright, Chromium, TinyFish, or Work and call the result Aside.

## Security / scope
- Official Jev computes bounded choice, noul, and score judgments; it does not authorize actions.
- Validate fresh browser state before any action and independently verify completion.
- Sending, payments, deleting, posting, and changing account settings require explicit approval.
- Do not store user passwords, session cookies, or TypeSafe credentials in this repository.
- Never mark a real mobile/browser end-to-end test as done based only on local mocks or CI.

## Evidence
The new Node tests cover missing tunnel keys, signed-out Aside, preflight, and no API key in CLI arguments. No successful OpenAI tunnel, connected Aside daemon, verified VPS browser execution, or iPhone tool call is claimed by these tests.
