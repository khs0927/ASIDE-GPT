# No-PC cloud browser handoff (verified 2026-10-14)

## Non-negotiable: mobile only, no PC

Keep official Aside automation distinct from independent cloud Chromium.

| Capability | Evidence | Result |
| --- | --- | --- |
| Phone-side ChatGPT → Cloudflare OAuth Worker → GitHub Actions | live Mobile Work Gateway runs | VERIFIED |
| Cloud-hosted Playwright on GitHub Actions | run 38552839151: example.com HTTP 200, screenshot.png | VERIFIED |
| Gateway tests and environment | runs 38552829939 and 38552821711 | VERIFIED |
| Security improvements to the public runner | PR #14 merged, deploy 38518878016 | VERIFIED |
| Cloudflare Browser Run REST | owner account /browser-rendering/markdown successfully rendered example.com | VERIFIED, not a permanent browser |
| Official Aside CLI mock preflight | ASIDE-GPT PR #26 CI and Gitleaks pass | CODE VERIFIED ONLY |
| Actual official Aside browser on cloud host | no authenticated running Aside host | NOT VERIFIED |
| Old Cloudflare chatcmd-mobile-vps and rhino-gpt-gateway tunnels | 0 active connections | OFFLINE |
| Remote command execution hosts | Termalin has zero registered servers; other remote links error | BLOCKED |

## Vendor source-of-truth

- https://docs.aside.com/help/developers documents local stdio Aside MCP and a hosted CLI login path. This does not prove that the browser itself runs on that host.
- https://docs.aside.com/help/channels-grok-bot.txt explicitly states the Aside browser must be running on a device for remote control.
- https://developers.cloudflare.com/browser-run/limits/ lists Workers Free browser duration as ten minutes per day.
- https://developers.cloudflare.com/browser-run/playwright/playwright-mcp/ describes a viable Cloudflare-hosted Playwright MCP; it is not the official Aside browser.

## Current operational architecture

1. Keep Mobile Work Gateway (khs0927/jev-browser-control-plane) and its reviewed SHA gated allowlist. Its live production runs support environment_check, gateway_tests and browser_check on GitHub-hosted machines with owner-scoped artifacts.
2. Use Cloudflare Browser Run REST or an OAuth-protected Worker for short-lived cloud browsing. Do not expose an unauthenticated headless browser MCP or raw CDP endpoint.
3. Use official Aside MCP only when an actual authenticated supported Aside browser host can be independently demonstrated. The credentials path is private and must not be committed or uploaded as a build artifact.
4. Jev Decision MCP is configured, but its live-inference validation and free entitlement are unverified. It is provider-metered; do not incur charges without a confirmed plan.

## Release gates

- Mobile Work Gateway security PR #14 was merged, and deployment https://github.com/khs0927/jev-browser-control-plane/actions/runs/38518878016 completed successfully.
- Postdeployment E2E run https://github.com/khs0927/jev-browser-control-plane/actions/runs/38552839151 produced successful browser evidence.
- ASIDE-GPT PR #26 must remain Draft until the official Aside host works and a real mobile MCP browser tool call returns grounded evidence.
- Keep ASIDE-GPT public until all user-requested work has been completed and verified; only then make it private and recheck Actions quota. The separately deployed mobile runner depends on a different repository.
- Do not provision paid infrastructure, publish secrets, or claim official Aside fully cloud-hosted without independent verification.
