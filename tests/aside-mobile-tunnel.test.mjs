import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const entry = resolve("scripts/aside-mobile-tunnel.mjs");

function fixture({ signedIn = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "aside-tunnel-test-"));
  for (const [name, code] of Object.entries({
    aside: '#!/bin/sh\nif [ "$1" = "account" ]; then echo "' +
      (signedIn ? "u0 account signed in" : "u0 account signed out") +
      '"; else echo "1.2.3"; fi\n',
    tunnel: '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "0.0.12"; else echo "$*" >> "$MOCK_CALLS"; fi\n'
  })) {
    const p = join(dir, name);
    writeFileSync(p, code);
    chmodSync(p, 0o755);
  }
  return { dir, aside: join(dir, "aside"), tunnel: join(dir, "tunnel"), calls: join(dir, "calls.txt") };
}
function invoke(f, mode, overrides = {}) {
  return spawnSync(process.execPath, [entry, mode], {
    encoding: "utf8", timeout: 10000,
    env: {
      ...process.env, ASIDE_BIN: f.aside, TUNNEL_CLIENT_BIN: f.tunnel,
      MOCK_CALLS: f.calls, CONTROL_PLANE_API_KEY: "fake-test-only",
      CONTROL_PLANE_TUNNEL_ID: "tunnel_0123456789abcdef", ...overrides
    }
  });
}

test("preflight confirms two installed binaries without auth", () => {
  const f = fixture({ signedIn: false });
  try {
    const r = invoke(f, "preflight", { CONTROL_PLANE_API_KEY: "" });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /PREFLIGHT_OK/);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test("doctor fails closed on signed-out Aside browser", () => {
  const f = fixture({ signedIn: false });
  try {
    const r = invoke(f, "doctor");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not confirmed signed in/);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test("doctor refuses absent tunnel runtime API key", () => {
  const f = fixture();
  try {
    const r = invoke(f, "doctor", { CONTROL_PLANE_API_KEY: "" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /CONTROL_PLANE_API_KEY/);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test("init uses official stdio sample without a key in arguments", () => {
  const f = fixture();
  try {
    const r = invoke(f, "init");
    assert.equal(r.status, 0, r.stderr);
    const calls = readFileSync(f.calls, "utf8");
    assert.match(calls, /sample_mcp_stdio_local/);
    assert.match(calls, /aside-mobile/);
    assert.match(calls, /mcp/);
    assert.doesNotMatch(calls, /fake-test-only/);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
