import assert from "node:assert/strict";
import { test } from "node:test";
import { BROWSER_PROVIDERS, selectBrowserProvider } from "../packages/providers/index.js";

test("official Aside remote is the primary browser provider", () => {
  const provider = selectBrowserProvider();
  assert.equal(provider.id, "aside-official-remote");
  assert.equal(provider.role, "primary");
  assert.equal(provider.status, "commercial-capability-confirmed");
  assert.equal(provider.publicIntegrationContract, "not-published");
  assert.equal(provider.callableFromAsideGpt, false);
});

test("Aside selection never silently becomes Work browser", () => {
  const provider = selectBrowserProvider("aside-official-remote");
  assert.equal(provider.id, "aside-official-remote");
  assert.equal(BROWSER_PROVIDERS["work-native"].role, "fallback");
});

test("Work browser remains an explicit fallback provider", () => {
  const provider = selectBrowserProvider("work-native");
  assert.equal(provider.id, "work-native");
  assert.equal(provider.status, "available-by-host");
});
