# Corrections — 2026-09-12

This document records architectural corrections made after clarifying the actual product requirement.

## Correct product requirement

ASIDE-GPT is intended to be operated from **ChatGPT on mobile with no user PC required**.

The earlier implementation incorrectly assumed that a trusted desktop computer would remain online and run an Aside CLI/browser, an ASIDE-GPT node agent, and a localhost gateway/tunnel. That model is invalid as the default architecture for this project.

## What was wrong

The following assumptions must not remain part of the active product path:

1. Requiring an always-on Windows/macOS/Linux PC owned by the user.
2. Requiring local Chrome or a locally installed Aside browser.
3. Requiring `localhost`, port forwarding, a reverse tunnel, Tailscale, Cloudflare Tunnel, or similar access to the user's machine.
4. Requiring the `apps/node` polling agent as the browser execution engine.
5. Treating a locally installed Aside CLI as a mandatory dependency.
6. Presenting the old `docs/MOBILE_SETUP.md` desktop/tunnel instructions as the mobile architecture.
7. Assuming that ChatGPT exposes a public programmable Cloud Browser API unless official current OpenAI documentation explicitly says so.
8. Assuming that Aside exposes a PC-free hosted browser/runtime API unless an official current Aside interface explicitly verifies it.

## Correct architecture direction

The active project should be designed around ChatGPT Work as the orchestration environment, using native cloud browser capabilities and connected Plugins/Apps when those capabilities are available to the user.

Conceptually:

```text
Mobile ChatGPT
      |
      v
ChatGPT Work / orchestration
      |
      +--> connected Plugins / Apps
      |
      +--> native cloud browser capability
      |
      +--> ASIDE-GPT skills, policies, schemas and workflow logic
      |
      v
Remote web services
```

This diagram is a product-level architecture, not a claim that there is a public Cloud Browser API that custom code can call directly.

## Role of Aside

Aside should not be forced into the critical path merely because the project is named ASIDE-GPT.

Until an official, PC-free hosted execution interface is verified, Aside should be treated as an optional/future provider or source of design inspiration rather than a mandatory runtime.

## Preservation of the first prototype

The first PC/local-node implementation is copied under `legacy/local-node/` on the `chatgpt/legacy-local-node-cleanup` branch. It remains available for historical reference but must not be documented as the normal installation path.

## Parallel-work boundary

To avoid conflicts with ChatGPT Work, this branch intentionally does **not** rewrite active files such as the root `README.md`, root workspace configuration, `apps/**`, or the active architecture documents. ChatGPT Work owns those files during the mobile-cloud refactor.

See GitHub issue #1 for the file ownership split and merge coordination.