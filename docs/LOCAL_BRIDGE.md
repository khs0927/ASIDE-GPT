# Local Gemini bridge

`packages/gemini-bridge/` is the runnable part of the vNext local-first runtime. It turns a Google AI Pro subscription into a local Gemini endpoint with no API key and no per-call cost, and exposes it to any agent (Aside, Antigravity, ChatGPT/Claude desktop hosts, scripts).

## Why the direction flipped

Two premises of the earlier plan did not hold when re-checked against official material:

- Aside's public model settings do not document local custom endpoints. AIMI documents a community-observed `~/.aside/u/0/models.json` route, but this is not proof of Aside agent tool-call compatibility. The text-only Gemini Web bridge must not be registered as a proven browser-agent model.
- Google currently documents personal Google account OAuth login for Gemini CLI (authentication documentation updated September 18, 2026). This is a separate credential and quota path from a signed-in `gemini.google.com` browser session.

The existing design allows Gemini to use Aside as a tool. An OAuth-backed OpenAI-compatible proxy is an additional, gated Aside custom-provider candidate:

```text
agy / any MCP host  ── reasoning (Gemini, AI Pro)
   ├── MCP: aside mcp            → Aside executes in the signed-in browser
   └── MCP: aside-gpt mcp        → gemini_ask (Gemini Web second opinion, files, Gems)

any OpenAI-compatible client
   └── http://127.0.0.1:8765/v1  → aside-gpt serve → Gemini Web / agy
```

## Backends

| Backend | How | Fallback trigger |
| --- | --- | --- |
| `gemini-web` (default first) | Connects to a **dedicated** Chrome profile over loopback CDP and operates gemini.google.com through the visible page only: new chat, mode selection, continue a conversation, file upload, Gems. Streams progress; returns Markdown with code blocks and tables preserved. | error, usage limit, signed out |
| `agy` | Runs the official Antigravity CLI non-interactively. | — |

Order is `ASIDE_GEMINI_BACKENDS` (default `gemini-web,agy`). For an important Google account, prefer the official path: `ASIDE_GEMINI_BACKENDS=agy,gemini-web`.

The router never splices answers: if a backend already streamed partial text and then fails, the request fails instead of continuing on another backend.

All DOM assumptions are in `packages/gemini-bridge/selectors.ts`. If Google changes the page, only that file changes.

## Commands

```bash
npm ci && npm run build && npm link     # or: scripts\install.ps1 on Windows
aside-gpt chrome                        # launch Chrome with the dedicated profile; sign in once
aside-gpt doctor                        # Chrome, sign-in, agy, Aside CLI, local model
aside-gpt ask "Reply with only: ASIDE_GEMINI_OK"
aside-gpt ask --mode Pro --file spec.pdf "Summarize the risks"
aside-gpt serve                         # OpenAI-compatible: http://127.0.0.1:8765/v1
aside-gpt mcp                           # stdio MCP: gemini_ask, gemini_status
aside-gpt setup-agy [--dry-run]         # register `aside mcp` + `aside-gpt mcp` with agy
aside-gpt probe-aside [--script f]      # does an Aside REPL call hit 402 / credits?
```

During development, `npm run cli -- <command>` runs the TypeScript source directly.

### OpenAI-compatible server

- `GET /v1/models` → `gemini-web`, `gemini-web:pro`, `gemini-web:thinking`, `gemini-web:fast`, plus `agy` when the agy backend is enabled.
- `POST /v1/chat/completions` with `stream: true|false`. `gemini-web:<mode>` selects that visible mode first; an unknown mode fails instead of silently using another model.
- `model: "agy"` runs only the Antigravity CLI backend (no Gemini Web fallback); this is the id `GeminiWebProvider` uses for the `agy` reasoning provider.
- Each request opens a new Gemini chat; earlier turns are sent as a transcript. The response carries a non-standard `gemini` field with the backend, conversation URL, sources, and attempts.
- Errors: usage limit → 429, signed out → 401, other → 502.
- Binds to `127.0.0.1`. Listening on any other interface is refused unless `ASIDE_GEMINI_API_KEY` is set, and then a bearer token is required.

### MCP tools

- `gemini_ask { prompt, mode?, conversation_url?, new_chat?, files?, gem? }` → Markdown answer plus `backend`, `mode`, `conversation_url` footer.
- `gemini_status {}` → reachability and sign-in state for each backend.

`setup-agy` registers the Gemini MCP server with `ASIDE_GEMINI_BACKENDS=gemini-web`, so agy never calls back into itself.

## Configuration

| Variable | Default |
| --- | --- |
| `ASIDE_GEMINI_BACKENDS` | `gemini-web,agy` |
| `ASIDE_GEMINI_CHROME_PORT` / `ASIDE_GEMINI_CDP_URL` | `9222` / `http://127.0.0.1:9222` (loopback enforced) |
| `ASIDE_GEMINI_CHROME_PATH` | auto-detect Chrome, then Edge |
| `ASIDE_GEMINI_CHROME_PROFILE` | `%LOCALAPPDATA%\aside-gpt\chrome-profile` (`~/.local/share/...` elsewhere) |
| `ASIDE_GEMINI_TIMEOUT_MS` | `300000` |
| `ASIDE_GEMINI_AGY_BIN` / `ASIDE_GEMINI_AGY_ARGS` / `ASIDE_GEMINI_AGY_MODEL` | `agy` / `--print {prompt}` / unset |
| `ASIDE_GEMINI_AGY_MCP_CONFIG` | `~/.gemini/antigravity/mcp_config.json` |
| `ASIDE_GEMINI_HOST` / `ASIDE_GEMINI_PORT` / `ASIDE_GEMINI_API_KEY` | `127.0.0.1` / `8765` / unset |
| `ASIDE_BIN` / `ASIDE_REPL_ARGS` | `aside` / `repl` |
| `ASIDE_LOCAL_MODEL_URL` | unset (e.g. `http://127.0.0.1:11434/v1`) |

`ASIDE_GEMINI_AGY_ARGS` is a template: `{prompt}` is replaced by the prompt as one argument (no shell). Without `{prompt}` the prompt is written to stdin — use that form if `agy` is a `.cmd` shim on Windows.

## Security boundaries

- The Chrome profile is **dedicated** (Chrome 136+ also refuses remote debugging on the default profile). The bridge never reads cookies, tokens, or profile files; you sign in by hand once.
- The DevTools port gives full control of that profile to any local process. It is loopback-only and the bridge rejects non-loopback CDP URLs. Do not expose it, and keep only the Gemini account in that profile.
- No Gemini internal RPC (`batchexecute`, `StreamGenerate`) is called; only the visible page is used.
- Gemini output is advisory text. It does not carry browser authority or approvals (see `scanOracleResponse` in `packages/gemini-web`).
- Automating the Gemini website may conflict with Google's terms and can lead to account limits. `agy` is the official path.

## Verification

- `npm test` covers config, router fallback, the OpenAI server (including SSE streaming and auth), the MCP protocol, the agy process runner, the Aside probe classifier, and the agy config merge.
- `npm run test:browser` drives the real `GeminiWebBackend` over CDP against `tests/fixtures/fake-gemini.html` in headless Chromium: streaming, conversation continuation, mode selection, file upload, Markdown fidelity, usage-limit and sign-in detection. Set `CHROME_PATH` if Chromium is not auto-detected. CircleCI runs it in the `browser` job.

## Not verified against production yet

- Selectors were matched against the known Gemini DOM and the fixture, not a live signed-in session. If the first real run cannot find the editor, fix `SELECTORS` in `selectors.ts`.
- `agy` flags (`--print`, `--model`) and the MCP config location come from community sources and may differ by version; both are configurable.
- Whether `aside repl` / `aside mcp` consume Aside credits is undocumented. `probe-aside` reports `credits-required`, `no-credit-signal`, `aside-unavailable`, or `inconclusive`; confirm a `no-credit-signal` result by checking the credit balance before and after. The REPL input language is also not a published contract, so the default probe script may need `--script`.
- If the REPL turns out to be credit-free, the next step is an `AsideReplBackend` that operates the Gemini tab inside Aside instead of a separate Chrome profile.
