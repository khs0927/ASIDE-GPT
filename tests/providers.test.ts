import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BROWSER_PROVIDERS,
  isAsideExecution,
  selectBrowserProvider,
} from "../packages/providers/index.js";

test("Aside remote is the primary target provider with a supported Channel transport", () => {
  const selection = selectBrowserProvider();
  assert.equal(selection.provider.id, "aside-remote");
  assert.equal(selection.provider.role, "primary");
  assert.equal(selection.provider.status, "channel-transport-available");
  assert.equal(selection.ready, true);
  assert.equal(isAsideExecution(selection.provider), true);
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

test("provider transport availability is distinct from per-user Channels activation", () => {
  const aside = BROWSER_PROVIDERS["aside-remote"];
  assert.equal(aside.performsAsideExecution, true);
  assert.equal(aside.callableFromAsideGpt, true);
  assert.match(aside.notes, /Channels/);
  assert.match(aside.notes, /Slack/);
  assert.match(aside.notes, /Cloud handoff/);
});
