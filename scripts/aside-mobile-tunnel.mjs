#!/usr/bin/env node
// Official Aside MCP -> OpenAI Secure MCP Tunnel. No browser or cloud API is emulated.
import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "preflight";
const validModes = new Set(["preflight", "init", "doctor", "run", "verify"]);
const aside = process.env.ASIDE_BIN || "aside";
const tunnel = process.env.TUNNEL_CLIENT_BIN || "tunnel-client";
const profile = process.env.ASIDE_TUNNEL_PROFILE || "aside-mobile";

function fail(message) {
  console.error("BLOCKED: " + message);
  process.exit(1);
}
if (!validModes.has(mode)) fail("Mode must be preflight, init, doctor, run, or verify.");
if (!/^[a-zA-Z0-9_-]{1,64}$/.test(profile)) fail("Invalid profile name.");
if (aside.includes("\n") || aside.includes('"')) fail("Unsafe ASIDE_BIN path.");

function probe(binary, args) {
  const result = spawnSync(binary, args, {
    encoding: "utf8", timeout: 15000, windowsHide: true,
    maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error || result.status !== 0) return { ok: false, output: "" };
  return { ok: true, output: result.stdout || "" };
}
function requireAuth() {
  const status = probe(aside, ["account", "status"]);
  // Do not echo account emails, session information, or CLI credentials.
  if (!status.ok || !/\bsigned in\b/i.test(status.output) ||
      /\bsigned out\b|\btoken.revoked\b|\bpaused\b/i.test(status.output)) {
    fail("Aside account is not confirmed signed in; use official Aside sign-in on the execution host.");
  }
}
function requireRuntimeKey() {
  if (!process.env.CONTROL_PLANE_API_KEY?.trim()) {
    fail("CONTROL_PLANE_API_KEY must be set in this process environment (never committed).");
  }
}
function runChecked(args) {
  const child = spawnSync(tunnel, args, { stdio: "inherit", windowsHide: true });
  if (child.error) fail("tunnel-client failed to start.");
  if (child.status !== 0) fail("tunnel-client returned a nonzero status.");
}
if (!probe(aside, ["--version"]).ok) {
  fail("Aside CLI not found. Install the official CLI and start the Aside browser daemon.");
}
if (!probe(tunnel, ["--version"]).ok) {
  fail("OpenAI tunnel-client not found. Install an official release first.");
}
console.log("PREFLIGHT_OK: Aside CLI and official tunnel-client are available.");
if (mode !== "preflight") {
  requireAuth();
  requireRuntimeKey();
}
if (mode === "init") {
  const id = process.env.CONTROL_PLANE_TUNNEL_ID || "";
  if (!/^tunnel_[a-zA-Z0-9_-]+$/.test(id)) fail("CONTROL_PLANE_TUNNEL_ID is missing or invalid.");
  const cmd = (/\s/.test(aside) ? '"' + aside + '"' : aside) + " mcp";
  runChecked([
    "init", "--sample", "sample_mcp_stdio_local",
    "--profile", profile, "--tunnel-id", id, "--mcp-command", cmd
  ]);
  console.log("PROFILE_CREATED: run doctor before connecting the ChatGPT plugin.");
 } else if (mode === "verify") {
  const raw = process.env.ASIDE_TUNNEL_HEALTH_URL;
  if (!raw) fail("ASIDE_TUNNEL_HEALTH_URL must be a loopback http://127.0.0.1:<port> URL.");
  let base;
  try { base = new URL(raw); } catch { fail("Malformed tunnel health URL."); }
  if (base.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) ||
      base.username || base.password || base.search || base.hash ||
      base.pathname !== "/") {
    fail("Tunnel health checks must use loopback HTTP only with no credentials or query.");
  }
  for (const path of ["/healthz", "/readyz", "/health/mcp"]) {
    let resp;
    try {
      resp = await fetch(new URL(path, base), {
        method: "GET", redirect: "error", signal: AbortSignal.timeout(5000)
      });
    } catch { fail(path + " not reachable on loopback."); }
    if (resp.status !== 200) fail(path + " returned HTTP " + resp.status + ".");
    console.log("TUNNEL_HEALTH_OK " + path + " HTTP 200");
  }
  console.log("READINESS_VERIFIED: live MCP discovery health is 200; a real Aside browser tool call is still required.");
} else if (mode === "doctor") {
  runChecked(["doctor", "--profile", profile, "--explain"]);
  console.log("DOCTOR_OK: now test /readyz and ChatGPT MCP tool discovery.");
} else if (mode === "run") {
  const child = spawn(tunnel, ["run", "--profile", profile], {
    stdio: "inherit", windowsHide: true, env: process.env
  });
  child.on("error", () => fail("Cannot launch tunnel-client."));
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
