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

## Local model smoke path

`packages/local-model.ts` provides a credential-free client for a host-provided OpenAI-compatible server on loopback HTTP. It supports `/v1/models` health checks and `/v1/chat/completions` with bounded non-streaming responses. It does not start Ollama or LM Studio, download models, access cookies, or call remote APIs.

Example host configuration:

```ts
const client = new LocalModelClient({
  baseUrl: "http://127.0.0.1:11434/v1",
  model: "your-local-model",
});
```

The host must run the local server separately. A failed local health check must remain visible and must not silently select a paid provider.


## Gemini Web provider adapter

`GeminiWebProvider` connects to the loopback OpenAI-compatible server exposed by `aside-gemini` at `http://127.0.0.1:8765/v1`.

```ts
const provider = new GeminiWebProvider();
const result = await provider.ask({
  prompt: "Return exactly: ASIDE_GEMINI_OK",
  mode: "oracle",
});
```

The adapter preserves provenance as `executor: "aside-gemini"` and `transport: "openai-compatible"`. It must not be relabeled as an Aside executor because the browser and Gemini routing are performed by the separate bridge. The provider is advisory and does not authorize browser actions.


## Antigravity CLI provider

`agy` is registered as an explicit external subscription reasoning provider. It is not inserted into Aside's built-in model picker because it is a separate CLI, not an official Aside model provider.

The bridge model name is:

```text
agy
```

Example:

```ts
const result = await provider.ask({
  prompt: "Return exactly: ASIDE_AGY_OK",
  mode: "oracle",
  model: "agy",
});
```

The host must install and authenticate `agy` separately. ASIDE-GPT records the execution provenance as `aside-gemini`, not as a built-in Aside model.
