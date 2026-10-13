import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const entry = resolve("scripts/aside-mobile-tunnel.mjs");

function mockBinaries() {
  const dir = mkdtempSync(join(tmpdir(), "aside-health-test-"));
  const aside = join(dir, "aside");
  const tunnel = join(dir, "tunnel");
  writeFileSync(aside, '#!/bin/sh\nif [ "$1" = "account" ]; then echo "u0 signed in"; else echo "1.2.3"; fi\n');
  writeFileSync(tunnel, '#!/bin/sh\necho "0.1.0"\n');
  chmodSync(aside, 0o755);
  chmodSync(tunnel, 0o755);
  return { dir, aside, tunnel };
}
function invoke(f, healthUrl) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, [entry, "verify"], {
      env: {
        ...process.env,
        ASIDE_BIN: f.aside, TUNNEL_CLIENT_BIN: f.tunnel,
        CONTROL_PLANE_API_KEY: "fake-test-key",
        ASIDE_TUNNEL_HEALTH_URL: healthUrl,
      },
    });
    let out = "", err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("close", (code) => resolveResult({ code, out, err }));
  });
}
async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolveReady) => server.listen(0, "127.0.0.1", resolveReady));
  try {
    return await fn("http://127.0.0.1:" + server.address().port);
  } finally {
    await new Promise((done) => server.close(done));
  }
}

test("verify accepts three live 200 readiness checks", async () => {
  const f = mockBinaries();
  try {
    await withServer((req, res) => {
      res.writeHead(["/healthz", "/readyz", "/health/mcp"].includes(req.url) ? 200 : 404);
      res.end("{}");
    }, async (url) => {
      const r = await invoke(f, url);
      assert.equal(r.code, 0, r.err);
      assert.match(r.out, /READINESS_VERIFIED/);
      assert.match(r.out, /TUNNEL_HEALTH_OK \/health\/mcp HTTP 200/);
    });
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test("verify rejects missing MCP discovery even if process and readyz are alive", async () => {
  const f = mockBinaries();
  try {
    await withServer((req, res) => {
      res.writeHead(req.url === "/health/mcp" ? 503 : 200);
      res.end("{}");
    }, async (url) => {
      const r = await invoke(f, url);
      assert.equal(r.code, 1);
      assert.match(r.err, /\/health\/mcp returned HTTP 503/);
    });
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test("verify rejects external health endpoints without making a request", async () => {
  const f = mockBinaries();
  try {
    const r = await invoke(f, "https://example.com/");
    assert.equal(r.code, 1);
    assert.match(r.err, /loopback HTTP only/);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
