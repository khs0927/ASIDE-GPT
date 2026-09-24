# ASIDE-GPT vNext local-first runtime

The vNext direction keeps Aside as the first browser executor, but no longer makes the unavailable official Remote API the center of the local development loop.

## Runtime order

```text
BrowserBackend
  1. Aside REPL              official, deterministic local browser surface
  2. Aside Agent             official, when model inference is required
  3. Browser Control         external fallback, explicit opt-in
  4. Playwright MCP          external fallback, explicit opt-in
  5. Aside Remote            future official remote control plane

ReasoningProvider
  1. Ollama / LM Studio      local and API-key-free where available
  2. ChatGPT / Claude        existing subscription paths when host-supported
  3. Gemini Web Oracle       bounded advisory subcall, never the main planner

GeminiTransport
  1. mcp-web-llm             primary MCP web-model transport candidate
  2. Aside REPL              official transport fallback and smoke test
  3. hermes-gem-pw           Gemini-specific workflows
  4. gemini-web2api-go       experimental, explicit opt-in only
```

The selection contracts live in `packages/browser-backend.ts`, `packages/reasoning-providers.ts`, and `packages/gemini-transports.ts`.

## Safety boundaries

- Aside REPL and Aside Agent results are Aside execution evidence.
- External browser backends are always marked as non-Aside execution.
- External fallbacks require explicit opt-in and cannot be selected silently.
- Gemini Web is an advisory oracle. It does not authorize clicks, submissions, settings changes, or credential entry.
- The repository does not read browser cookies, passwords, passkeys, OTP seeds, or private profile files.
- `gemini-web2api-go` is isolated as experimental and is never a default route.
- `aside-remote` remains fail-closed until an official authenticated contract is supplied.

## First smoke tests

1. Verify `aside repl` can open a deterministic page and return a stable result without inventing a transport.
2. Verify `mcp-web-llm` can use an already signed-in Gemini tab through its supported MCP contract.
3. Run a read-only Gemini request and validate the response, source links, and correlation ID.
4. Test an external browser fallback only with explicit opt-in and verify its result is not labeled Aside execution.
5. Keep the existing credential, approval, and evidence tests green.

No endpoint, OAuth flow, cookie extraction, or reverse-engineered Gemini protocol is added by this change.
