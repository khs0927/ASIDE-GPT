import { homedir } from "node:os";
import { join } from "node:path";
import type { GeminiBackendId } from "./types.js";

export interface BridgeConfig {
  /** Backend order; the router falls through on failure. */
  backends: GeminiBackendId[];
  /** Chrome DevTools endpoint of the dedicated signed-in profile. Loopback only. */
  cdpUrl: string;
  /** Overridable for tests; production is https://gemini.google.com. */
  geminiUrl: string;
  chromePath: string | undefined;
  chromeProfileDir: string;
  chromePort: number;
  timeoutMs: number;
  agyBin: string;
  agyArgs: string[];
  agyModel: string | undefined;
  agyMcpConfigPath: string;
  asideBin: string;
  asideReplArgs: string[];
  serverHost: string;
  serverPort: number;
  /** Optional bearer token for the OpenAI-compatible server. */
  apiKey: string | undefined;
  localModelUrl: string | undefined;
}

const BACKEND_IDS: readonly GeminiBackendId[] = ["gemini-web", "agy"];

function list(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined || value.trim() === "") return fallback;
  return value.split(/[,\s]+/).filter(Boolean);
}

/** Splits an args template on whitespace; `{prompt}` marks where the prompt goes. */
function args(value: string | undefined, fallback: string[]): string[] {
  return value === undefined || value.trim() === "" ? fallback : value.trim().split(/\s+/);
}

function int(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function defaultProfileDir(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.LOCALAPPDATA ?? join(homedir(), ".local", "share");
  return join(base, "aside-gpt", "chrome-profile");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const backends = list(env.ASIDE_GEMINI_BACKENDS, ["gemini-web", "agy"]);
  for (const id of backends) {
    if (!BACKEND_IDS.includes(id as GeminiBackendId)) {
      throw new Error(`ASIDE_GEMINI_BACKENDS: unknown backend "${id}" (use ${BACKEND_IDS.join(", ")})`);
    }
  }
  const chromePort = int(env.ASIDE_GEMINI_CHROME_PORT, 9223, "ASIDE_GEMINI_CHROME_PORT");
  return {
    backends: backends as GeminiBackendId[],
    cdpUrl: env.ASIDE_GEMINI_CDP_URL ?? `http://127.0.0.1:${chromePort}`,
    geminiUrl: (env.ASIDE_GEMINI_URL ?? "https://gemini.google.com").replace(/\/$/, ""),
    chromePath: env.ASIDE_GEMINI_CHROME_PATH,
    chromeProfileDir: env.ASIDE_GEMINI_CHROME_PROFILE ?? defaultProfileDir(env),
    chromePort,
    timeoutMs: int(env.ASIDE_GEMINI_TIMEOUT_MS, 300_000, "ASIDE_GEMINI_TIMEOUT_MS"),
    agyBin: env.ASIDE_GEMINI_AGY_BIN ?? "agy",
    agyArgs: args(env.ASIDE_GEMINI_AGY_ARGS, ["--print", "{prompt}"]),
    agyModel: env.ASIDE_GEMINI_AGY_MODEL,
    agyMcpConfigPath:
      env.ASIDE_GEMINI_AGY_MCP_CONFIG ?? join(homedir(), ".gemini", "antigravity", "mcp_config.json"),
    asideBin: env.ASIDE_BIN ?? "aside",
    asideReplArgs: args(env.ASIDE_REPL_ARGS, ["repl"]),
    serverHost: env.ASIDE_GEMINI_HOST ?? "127.0.0.1",
    serverPort: int(env.ASIDE_GEMINI_PORT, 8766, "ASIDE_GEMINI_PORT"),
    apiKey: env.ASIDE_GEMINI_API_KEY || undefined,
    localModelUrl: env.ASIDE_LOCAL_MODEL_URL || undefined,
  };
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK.has(host);
}

/** The DevTools port grants full control of a signed-in profile; never reach it off-box. */
export function assertLoopbackCdp(cdpUrl: string): void {
  const url = new URL(cdpUrl);
  if (!/^(?:http|ws)s?:$/.test(url.protocol) || !isLoopbackHost(url.hostname)) {
    throw new Error(`CDP endpoint must be a loopback address, got ${cdpUrl}`);
  }
}
