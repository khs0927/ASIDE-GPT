import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BROWSER_BACKENDS,
  isAsideBackend,
  selectBrowserBackend,
  selectReasoningProvider,
  selectGeminiTransport,
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

test("Gemini web transport defaults to mcp-web-llm and isolates experiments", () => {
  const primary = selectGeminiTransport({
    available: { "mcp-web-llm": true, "gemini-web2api-go": true },
  });
  assert.equal(primary.transport.id, "mcp-web-llm");
  assert.equal(primary.fallbackUsed, false);

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
