# Legacy local-node prototype

> **Deprecated / archival only. This is not the ASIDE-GPT product architecture.**

This directory preserves the first ASIDE-GPT prototype that assumed an always-on user-controlled PC running an Aside CLI/browser plus a gateway/node bridge.

That assumption does **not** match the product requirement. The user intends to operate ASIDE-GPT from ChatGPT on mobile without requiring a PC, local Chrome, localhost, a desktop daemon, port forwarding, a tunnel to a personal machine, or a locally running Aside CLI.

## Why this code is archived

The prototype is kept only for historical reference and for selectively reusing implementation ideas such as task schemas, security boundaries, or MCP patterns. It must not be presented as the default installation or runtime.

The archived snapshot contains:

- `apps/gateway/` — remote MCP gateway from the abandoned local-node design
- `apps/node/` — polling execution agent intended to run on a trusted PC
- `.env.example` — legacy local-node environment variables
- `package.json` / `tsconfig.base.json` — build metadata for the prototype snapshot
- `docs/ARCHITECTURE_OLD.md`
- `docs/MOBILE_SETUP_OLD.md`

## Current non-negotiable requirement

The active architecture must satisfy all of the following:

- no user PC required
- no local browser required
- no localhost bridge required
- no desktop daemon required
- no personal-device tunnel required
- mobile ChatGPT is the user's control surface
- cloud/native ChatGPT capabilities and connected Plugins/Apps should be preferred where they can perform the task
- no implementation may invent or assume a public OpenAI Cloud Browser API
- no implementation may invent or assume a hosted Aside API; an Aside cloud provider is allowed only after an official PC-free execution interface is verified

See `docs/CORRECTIONS_2026-09-12.md` and GitHub issue #1 for the parallel-work boundary.