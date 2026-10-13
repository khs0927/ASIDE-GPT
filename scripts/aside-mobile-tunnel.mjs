#!/usr/bin/env node
// Official Aside MCP -> OpenAI Secure MCP Tunnel. No browser or cloud API is emulated.
import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "preflight";
const validModes = new Set(["preflight", "init", "doctor", "run"]);
const aside = process.env.ASIDE_BIN || "aside";
const tunnel = process.env.TUNNEL_CLIENT_BIN || "tunnel-client";
const profile = process.env.ASIDE_TUNNEL_PROFILE || "aside-mobile";

function fail(message) {
  console.error("BLOCKED: " + message);
  process.exit(1);
}
if (!validModes.has(mode)) fail("Mode must be preflight, init, doctor, or run.");
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
