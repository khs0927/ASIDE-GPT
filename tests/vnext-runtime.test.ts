import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BROWSER_BACKENDS,
  isAsideBackend,
  selectBrowserBackend,
  selectReasoningProvider,
  selectGeminiTransport,
  LocalModelClient,
  LocalModelError,
} from "../packages/index.js";

test("vNext browser selection prefers the official Aside REPL", () => {
  const selection = selectBrowserBackend({
    available: {
      "aside-repl": true,
      "aside-agent": true,
      "browser-control": true,
    },
  });

  assert.equal(selection.backend.id, "aside-repl");
  assert.equal(selection.ready, true);
  assert.equal(selection.fallbackUsed, false);
  assert.equal(isAsideBackend(selection.backend), true);
});

test("external browser backends require explicit opt-in", () => {
  const blocked = selectBrowserBackend({
    available: { "browser-control": true },
  });
  assert.equal(blocked.ready, false);
  assert.equal(blocked.blockedReason, "no-browser-backend-available");

  const explicit = selectBrowserBackend({
    available: { "browser-control": true },
    allowExternalFallback: true,
  });
  assert.equal(explicit.backend.id, "browser-control");
  assert.equal(explicit.ready, true);
  assert.equal(explicit.fallbackUsed, true);
  assert.equal(isAsideBackend(explicit.backend), false);
});

test("Aside remote stays a future official backend", () => {
  const withoutAccess = selectBrowserBackend({ asideRemoteAvailable: false });
  assert.equal(withoutAccess.backend.id, "aside-repl");
  assert.equal(withoutAccess.ready, false);

  const hintedButUnauthorized = selectBrowserBackend({
    available: { "aside-remote": true },
    asideRemoteAvailable: false,
  });
  assert.equal(hintedButUnauthorized.backend.id, "aside-remote");
  assert.equal(hintedButUnauthorized.ready, false);
  assert.equal(hintedButUnauthorized.blockedReason, "official-aside-access-required");

  const withAccess = selectBrowserBackend({ asideRemoteAvailable: true });
  assert.equal(withAccess.backend.id, "aside-remote");
  assert.equal(withAccess.ready, true);
  assert.equal(withAccess.backend.status, "official-access-required");
});

test("local reasoning is preferred and Gemini web is advisory only", () => {
  const local = selectReasoningProvider({
    available: { ollama: true, "gemini-web-oracle": true },
  });
  assert.equal(local.provider.id, "ollama");
  assert.equal(local.provider.kind, "local-model");

  const withoutOracle = selectReasoningProvider({
    available: { "gemini-web-oracle": true },
  });
  assert.equal(withoutOracle.ready, false);

  const oracle = selectReasoningProvider({
    preferred: "gemini-web-oracle",
    available: { "gemini-web-oracle": true },
    allowWebOracle: true,
  });
  assert.equal(oracle.provider.role, "advisory");
});

test("agy is an explicit subscription reasoning provider", () => {
  const selected = selectReasoningProvider({
    preferred: "agy",
    available: { agy: true },
  });
  assert.equal(selected.provider.id, "agy");
  assert.equal(selected.provider.kind, "subscription");
  assert.equal(selected.ready, true);
  assert.equal(selected.fallbackUsed, false);
});

test("Gemini web transport defaults to the built-in bridge and isolates experiments", () => {
  const primary = selectGeminiTransport({
    available: { "gemini-web-cdp": true, "mcp-web-llm": true, "gemini-web2api-go": true },
  });
  assert.equal(primary.transport.id, "gemini-web-cdp");
  assert.equal(primary.transport.status, "built-in");
  assert.equal(primary.fallbackUsed, false);

  const official = selectGeminiTransport({
    available: { "antigravity-cli": true, "mcp-web-llm": true },
  });
  assert.equal(official.transport.id, "antigravity-cli");
  assert.equal(official.fallbackUsed, true);

  const external = selectGeminiTransport({ preferred: "mcp-web-llm", available: { "mcp-web-llm": true } });
  assert.equal(external.transport.id, "mcp-web-llm");
  assert.equal(external.fallbackUsed, false);

  const experimental = selectGeminiTransport({
    preferred: "gemini-web2api-go",
    available: { "gemini-web2api-go": true },
  });
  assert.equal(experimental.ready, false);
  assert.equal(experimental.blockedReason, "no-gemini-transport-available");

  const optedIn = selectGeminiTransport({
    preferred: "gemini-web2api-go",
    available: { "gemini-web2api-go": true },
    allowExperimental: true,
  });
  assert.equal(optedIn.ready, true);
  assert.equal(optedIn.transport.requiresExplicitOptIn, true);
});

test("vNext catalog keeps the future remote boundary explicit", () => {
  assert.equal(BROWSER_BACKENDS["aside-repl"].executor, "aside");
  assert.equal(BROWSER_BACKENDS["aside-remote"].executor, "aside");
  assert.equal(BROWSER_BACKENDS["aside-remote"].role, "future");
});

test("local model client only accepts loopback endpoints", () => {
  assert.throws(
    () => new LocalModelClient({ baseUrl: "https://api.example.com/v1" }),
    LocalModelError,
  );
  assert.throws(
    () => new LocalModelClient({ baseUrl: "http://user:secret@127.0.0.1:11434/v1" }),
    LocalModelError,
  );
});

test("local model client checks health and parses a completion", async () => {
  const calls: string[] = [];
  const client = new LocalModelClient({
    baseUrl: "http://127.0.0.1:11434/v1",
    fetchImpl: async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: "qwen-local" }] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          model: "qwen-local",
          choices: [{ finish_reason: "stop", message: { content: "LOCAL_OK" } }],
        }),
        { status: 200 },
      );
    },
  });

  const health = await client.healthCheck();
  assert.deepEqual(health, { available: true, status: 200, models: ["qwen-local"] });
  const completion = await client.complete({
    model: "qwen-local",
    messages: [{ role: "user", content: "Return LOCAL_OK" }],
  });
  assert.equal(completion.content, "LOCAL_OK");
  assert.equal(completion.model, "qwen-local");
  assert.deepEqual(calls, [
    "http://127.0.0.1:11434/v1/models",
    "http://127.0.0.1:11434/v1/chat/completions",
  ]);
});
