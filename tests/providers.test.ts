import assert from "node:assert/strict";
import { test } from "node:test";
import { BROWSER_PROVIDERS, selectBrowserProvider } from "../packages/providers/index.js";

test("Work native is the only active browser provider", () => {
  const provider = selectBrowserProvider();
  assert.equal(provider.id, "work-native");
  assert.equal(provider.callableFromAsideGpt, false);
  assert.equal(provider.status, "available-by-host");
});

test("unverified Aside cloud never becomes an active endpoint", () => {
  const provider = selectBrowserProvider("aside-cloud");
  assert.equal(provider.id, "work-native");
  assert.equal(BROWSER_PROVIDERS["aside-cloud"].status, "unverified");
});
