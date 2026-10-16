# ASIDE-GPT — Gemini provider integration, evidence-first

Date: 2026-10-16 (Asia/Seoul)
Target repository: https://github.com/khs0927/ASIDE-GPT
Analyzed main commit: `b7bd054dfcaeae2595b86813f2a40d4197504354`
Related unmerged change: PR #24 (`fix/gemini-web-model-id`, `1faa8e61afd115b4b29e7cab8bf770c2b0bbcb02`)

## Result, explicitly separated by evidence level

- **Implemented in this patch:** safe local Aside provider preview, loopback-only boundary, `/v1/models` discovery, structured `tool_calls` probe, guarded models.json registration with timestamped backup and idempotency.
- **Locally verified:** 17/17 self-contained Node.js tests, including an actual local HTTP mock server. These are contract/fixture tests, *not* Gemini, CLIProxyAPI, or Aside integration tests.
- **Not implemented/not verified:** Gemini account authentication, CLIProxyAPI installation or server start, production Gemini website UI operation, real Aside tool-execution E2E, live Cloudflare routing, iPhone-only execution, production deployment and subscription entitlements.
- **No credentials collected:** no Google password, browser cookies, OAuth refresh tokens, or private session files are accessed or printed.

## Selection and boundaries

| Source | Public evidence | Fit / caveats | Decision |
| --- | --- | --- | --- |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) (Apache-2.0) | Official Google OAuth account login, free/paid quotas documented: https://geminicli.com/docs/get-started/authentication/ | Official OAuth is **not** a `gemini.google.com` browser cookie. CLI/Code Assist quota and model offerings differ from the Gemini website. | Preferred auth for an API-compatible agent pathway |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) (MIT) | Documents OpenAI-compatible `/v1`, OAuth-based Gemini CLI routing, SSE and function calling | Third-party proxy; still must install, review dependencies and run live authenticated checks. | Preferred standalone API gateway, **not bundled** |
| [AIMI](https://github.com/TH33ORACL3/aimi) (MIT) | Documents Aside `~/.aside/u/0/models.json` and `api: openai-completions` model format; includes backups and restart guidance | Community-observed schema, not a supported Aside API guarantee | Adopt registration contract principles, original independent implementation |
| [Agentify Desktop](https://github.com/agentify-sh/desktop) (MPL-2.0) | Documents dedicated Chrome CDP profile and MCP control of logged-in Gemini web UI | Local desktop session dependency; cannot be directly deployed as a stateless Cloudflare Worker. MPL source not copied. | Design reference for existing CDP Web bridge |
| [gemini-web-mcp](https://github.com/minanagehsalalma/gemini-web-mcp) (MIT) | Unofficial direct transport + Playwright fallback | Session/RPC fragility and maintenance exposure; weak independent adoption evidence | Do not integrate direct undocumented Google RPC/cookie transport |
| ASIDE-GPT existing gemini-web backend | Chrome CDP, fixture-based browser tests, OpenAI chat facade and MCP tool; main CircleCI checks | Upstream facade does not implement general OpenAI `tool_calls` contract; text completion alone cannot prove Aside browser-agent compatibility | Preserve as optional signed-in website **advisory**, not claimed as full agent model |

**Correction to existing `docs/LOCAL_BRIDGE.md`:** any claim that personal Google login is no longer available in Gemini CLI conflicts with Google's documentation updated September 18, 2026: https://geminicli.com/docs/get-started/authentication/. Clarify Google OAuth and browser-session access are different surfaces.

## Architecture and end-to-end gate

```text
Aside local UI (custom provider; remains unchanged until approved)
    -> ~/.aside/u/0/models.json (new namespace, preserve old providers)
    -> http://127.0.0.1:8317/v1 (loopback-only, external CLIProxyAPI)
    -> Gemini CLI OAuth (separate from gemini.google.com web session)

Gemini Web existing separate advisory track:
    Dedicated local Chrome profile -> ASIDE-GPT CDP bridge :9223 -> HTTP :8766/MCP
    This is not an authenticated, tool-calling Aside model until separately demonstrated.
```

### Safe setup (after trusted CLIProxyAPI is installed separately)

1. Use your own Google's OAuth approval screen from the **official Gemini CLI or reviewed proxy**, never enter a password, token, or cookie in the chat.
2. Keep the proxy bound to `127.0.0.1` (upstream example configurations may listen on all interfaces). Configure a **client** API key in CLIProxyAPI, supply it as `CLIPROXYAPI_API_KEY` to the local helper without exposing it in chat or logs, and identify the model ID via authenticated `GET http://127.0.0.1:8317/v1/models`. Do not assume fixed model IDs.
3. Preview (zero network/model requests and zero file changes):

```bash
npm run aside:gemini -- --model EXACT_MODEL_ID
```

4. Optional probe (GET models, then **one** quota-consuming model request with a harmless tool declaration; no local writes):

```bash
npm run aside:gemini -- --model EXACT_MODEL_ID --check
```

5. Only after separately approving the local Aside configuration change:

```bash
npm run aside:gemini -- --model EXACT_MODEL_ID --apply
```

The apply command performs its own probe and **only** changes `~/.aside/u/0/models.json` if a native `tool_calls` entry is returned. A dated backup is created, no default model/credential file is changed, and an existing provider ID is never overwritten. Restart Aside, then test `aside -m gemini-cli-oauth/EXACT_MODEL_ID` and perform a real harmless browser task. A model-proxy contract check is not proof that Aside's full tool execution works.

### Rollback

Stop using the newly registered provider. Inspect the new models.json and the emitted `.bak.aside-gemini-...` backup. Only with explicit local approval, restore the backup if you confirm no other changes were made after registration; then restart Aside. Do not perform unconditional file deletion or automatic rollback over more recent user edits.

### Required live acceptance checklist (all currently NOT VERIFIED)

- [ ] Google OAuth authorization obtained via supported user-driven login; no secrets appear in logs/repo.
- [ ] Reviewed and locally started CLIProxyAPI; `/v1/models` returns an exact selectable Gemini model.
- [ ] `--check` returns an OpenAI native `tool_calls` object with `aside_bridge_probe`.
- [ ] Provider registration completed with backup; Aside loads it after restart.
- [ ] `aside -m ...` executes an actual harmless browser action using the returned tool call, with executor evidence and no synthetic success.
- [ ] Streaming tool calls, multiple turns, system/developer instruction handling, stop/cancel, quota/auth expiry (401/429), and no-silent-fallback behavior verified against the real session.
- [ ] Resolve [PR #24](https://github.com/khs0927/ASIDE-GPT/pull/24) CircleCI `verify` failure (browser job passed, verify job failed); do not equate its PR description with a passed CI gate.
- [ ] Explicitly confirm whether user accepts **separate official OAuth** rather than reusing the existing Gemini website browser cookie.
- [ ] For iPhone-without-PC: identify an approved, no-charge always-on execution host and supported remote Aside contract; this local-only prototype is not a remote replacement.

## Cost/security/terms

- This patch itself has zero API/subscription cost; the synthetic mock tests use no external network. The optional live probe consumes a provider quota request, and third-party network infrastructure may cost money. No billing settings are changed.
- Google's web app session cannot be converted into an officially supported API key by changing browser cookies. The unofficial CDP path may be fragile or subject to terms/usage restrictions; do not automate login/CAPTCHA or extract cookies.
- A CLIProxyAPI *client* key (different from Google credentials) is normally required. The helper reads `CLIPROXYAPI_API_KEY` from the local process environment, sends it only as a Bearer header to the loopback proxy, redacts it from previews and writes it only to the local Aside model config when approved. The saved file and its backup are chmod 0600; do not commit either.
- No `.aside` user credential material should be committed to GitHub. Local Chrome DevTools and the local proxy should not be exposed on public addresses.
- Downstream source licensing: only public schema ideas from MIT-licensed AIMI are used; no source lines from MPL-2.0 Agentify or GPL/copyleft code are included.
