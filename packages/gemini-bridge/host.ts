/**
 * Host integration helpers: dedicated Chrome profile, Aside REPL credit probe,
 * and Antigravity MCP registration. Nothing here reads browser cookies or
 * credentials; the user signs in to Gemini manually in the dedicated profile.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { runProcess, type ProcessResult } from "./agy.js";
import { assertLoopbackCdp } from "./config.js";

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

export function chromeCandidates(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string[] {
  if (platform === "win32") {
    const roots = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(Boolean) as string[];
    return roots.flatMap((root) => [
      `${root}\\Google\\Chrome\\Application\\chrome.exe`,
      `${root}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ]);
  }
  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }
  return ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
}

export function findChrome(explicit?: string): string | undefined {
  if (explicit) return existsSync(explicit) ? explicit : undefined;
  return chromeCandidates().find((path) => existsSync(path));
}

/**
 * Chrome 136+ ignores --remote-debugging-port on the default profile, so the
 * bridge always uses its own --user-data-dir. Chrome binds the port to loopback.
 */
export function chromeArgs(profileDir: string, port: number, startUrl: string): string[] {
  return [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    startUrl,
  ];
}

export async function launchChrome(chromePath: string, profileDir: string, port: number, startUrl: string): Promise<void> {
  await mkdir(profileDir, { recursive: true });
  const child = spawn(chromePath, chromeArgs(profileDir, port, startUrl), { detached: true, stdio: "ignore" });
  child.unref();
}

export async function cdpVersion(cdpUrl: string, timeoutMs = 3_000): Promise<{ ok: boolean; detail: string }> {
  assertLoopbackCdp(cdpUrl);
  try {
    const response = await fetch(`${cdpUrl.replace(/\/$/, "")}/json/version`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };
    const info = (await response.json()) as { Browser?: string };
    return { ok: true, detail: info.Browser ?? "reachable" };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "unreachable" };
  }
}

// ---------------------------------------------------------------------------
// Aside REPL credit probe
// ---------------------------------------------------------------------------

export const PROBE_MARKER = "ASIDE_REPL_OK";

/**
 * Default probe script. The REPL's input language is not publicly documented
 * as a stable contract; pass --script with a file adapted to your Aside
 * version if this one is rejected. It must print PROBE_MARKER on success.
 */
export const DEFAULT_PROBE_SCRIPT = [
  'await page.goto("https://gemini.google.com/app")',
  `console.log("${PROBE_MARKER} " + (await page.title()))`,
  "",
].join("\n");

export type AsideProbeVerdict = "credits-required" | "no-credit-signal" | "aside-unavailable" | "inconclusive";

export function classifyAsideProbe(result: ProcessResult): { verdict: AsideProbeVerdict; detail: string } {
  const output = `${result.stdout}\n${result.stderr}`;
  const tail = output.trim().slice(-400);
  if (result.spawnError) return { verdict: "aside-unavailable", detail: result.spawnError };
  if (/\b402\b|payment required|insufficient credits?|out of credits|credits? (?:exhausted|required)|크레딧/i.test(output)) {
    return { verdict: "credits-required", detail: tail };
  }
  if (result.code === 0 && output.includes(PROBE_MARKER)) {
    return {
      verdict: "no-credit-signal",
      detail: "REPL ran without a 402/credit error. Compare the credit balance in Aside settings before and after to confirm zero usage.",
    };
  }
  if (result.timedOut) return { verdict: "inconclusive", detail: "REPL timed out" };
  return { verdict: "inconclusive", detail: tail || `exit code ${result.code}` };
}

export async function probeAside(bin: string, replArgs: readonly string[], script: string, timeoutMs = 120_000) {
  const result = await runProcess(bin, replArgs, { stdin: script, timeoutMs, allowShellShim: true });
  return { ...classifyAsideProbe(result), exitCode: result.code };
}

// ---------------------------------------------------------------------------
// Antigravity MCP registration
// ---------------------------------------------------------------------------

export interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export function agyMcpEntries(nodePath: string, cliPath: string, asideBin: string): Record<string, McpServerEntry> {
  return {
    aside: { command: asideBin, args: ["mcp"] },
    // agy calling back into agy would loop, so this server only uses the browser path.
    "aside-gpt-gemini": { command: nodePath, args: [cliPath, "mcp"], env: { ASIDE_GEMINI_BACKENDS: "gemini-web" } },
  };
}

export async function mergeMcpConfig(
  path: string,
  entries: Record<string, McpServerEntry>,
  options: { dryRun?: boolean } = {},
): Promise<{ path: string; backup?: string; config: Record<string, unknown> }> {
  let existing: Record<string, unknown> = {};
  if (existsSync(path)) {
    const raw = await readFile(path, "utf8");
    try {
      existing = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      throw new Error(`${path} is not valid JSON; fix or move it before running setup-agy`);
    }
  }
  const servers = { ...((existing.mcpServers as Record<string, unknown> | undefined) ?? {}), ...entries };
  const config = { ...existing, mcpServers: servers };
  if (options.dryRun) return { path, config };
  await mkdir(dirname(path), { recursive: true });
  let backup: string | undefined;
  if (existsSync(path)) {
    backup = `${path}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await copyFile(path, backup);
  }
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { path, config, ...(backup ? { backup } : {}) };
}
