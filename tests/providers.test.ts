import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BROWSER_PROVIDERS,
  isAsideExecution,
  selectBrowserProvider,
} from "../packages/providers/index.js";

test("Aside remote is the primary target provider", () => {
  const selection = selectBrowserProvider();
  assert.equal(selection.provider.id, "aside-remote");
  assert.equal(selection.provider.role, "primary");
  assert.equal(selection.provider.status, "official-access-required");
  assert.equal(selection.ready, false);
  assert.equal(selection.blockedReason, "official-aside-access-required");
  assert.equal(isAsideExecution(selection.provider), true);
});

test("an authorized runtime adapter makes Aside ready without changing catalog metadata", () => {
  const selection = selectBrowserProvider({ asideRemoteAvailable: true });
  assert.equal(selection.provider.id, "aside-remote");
  assert.equal(selection.ready, true);
  assert.equal(selection.blockedReason, undefined);
  assert.equal(selection.provider.callableFromAsideGpt, false);
});

test("Work native is only selected through explicit non-Aside fallback", () => {
  const implicit = selectBrowserProvider({ preferred: "work-native" });
  assert.equal(implicit.provider.id, "aside-remote");
  assert.equal(implicit.fallbackUsed, false);

  const explicit = selectBrowserProvider({
    preferred: "work-native",
    allowNonAsideFallback: true,
  });
  assert.equal(explicit.provider.id, "work-native");
  assert.equal(explicit.ready, true);
  assert.equal(explicit.fallbackUsed, true);
  assert.equal(isAsideExecution(explicit.provider), false);
});

test("official product capability is distinct from public connector readiness", () => {
  const aside = BROWSER_PROVIDERS["aside-remote"];
  assert.equal(aside.performsAsideExecution, true);
  assert.equal(aside.callableFromAsideGpt, false);
  assert.match(aside.notes, /Channels/);
  assert.match(aside.notes, /Cloud handoff/);
});
