# Project Status — 2026-09-24

## Local-first runtime (current focus)

- Runnable Gemini bridge in `packages/gemini-bridge/`: Gemini Web over a dedicated Chrome profile, Antigravity CLI fallback, OpenAI-compatible server, stdio MCP server, and `aside-gpt` CLI (`chrome`, `ask`, `serve`, `mcp`, `doctor`, `probe-aside`, `setup-agy`). See [LOCAL_BRIDGE.md](LOCAL_BRIDGE.md).
- Verified in CI against a Gemini fixture in headless Chromium; not yet verified against a live signed-in Gemini session.
- Open measurements: whether `aside repl` / `aside mcp` consume credits (`aside-gpt probe-aside`), and the exact `agy` flags on the user's version.

## Remote track (2026-09-12)

## Done

- User-PC/local-node architecture archived as legacy.
- Mobile-only requirement established.
- Work-created policy, approval, evidence, schema, skill, and CI scaffolding completed.
- Official Aside remote/cloud product capabilities re-verified from current pricing and changelog.
- Primary architecture corrected back to Aside execution rather than a replacement browser.
- Minimum official access contract documented.
- Activation checklist documented.

## Single external blocker

The public Aside developer documentation currently does not publish the endpoint/auth/schema behind the officially advertised `Channels (Remote control)`, `Cloud handoff`, or app/cron/internal-tool browser-agent run capability.

The project must not fabricate that contract.

## Ready state

The repository is ready to implement the final thin network adapter as soon as Aside exposes or grants the official remote integration contract. No new browser engine, user PC, tunnel, or local daemon is required by the target architecture.
