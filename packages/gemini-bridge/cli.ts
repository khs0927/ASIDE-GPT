#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { LocalModelClient } from "../local-model.js";
import { AgyBackend, runProcess } from "./agy.js";
import { loadConfig, type BridgeConfig } from "./config.js";
import { GeminiWebBackend } from "./gemini-web.js";
import {
  agyMcpEntries,
  cdpVersion,
  DEFAULT_PROBE_SCRIPT,
  findChrome,
  launchChrome,
  mergeMcpConfig,
  probeAside,
} from "./host.js";
import { serveMcp } from "./mcp-server.js";
import { createOpenAIServer } from "./openai-server.js";
import { GeminiRouter } from "./router.js";
import type { GeminiBackend } from "./types.js";

const USAGE = `aside-gpt — local Gemini bridge for ASIDE-GPT

Usage:
  aside-gpt chrome                     Launch Chrome with the dedicated Gemini profile
  aside-gpt ask <prompt> [--mode Pro] [--file path]... [--gem id] [--continue url] [--json]
  aside-gpt serve [--port 8765]        OpenAI-compatible server at http://127.0.0.1:8765/v1
  aside-gpt mcp                        stdio MCP server (gemini_ask, gemini_status)
  aside-gpt doctor                     Check Chrome, Gemini sign-in, agy, Aside, local model
  aside-gpt probe-aside [--script f]   Run one Aside REPL call and look for credit errors
  aside-gpt setup-agy [--dry-run]      Register Aside + Gemini MCP servers with Antigravity

Environment: ASIDE_GEMINI_BACKENDS (default "gemini-web,agy"), ASIDE_GEMINI_CDP_URL,
ASIDE_GEMINI_CHROME_PATH, ASIDE_GEMINI_CHROME_PROFILE, ASIDE_GEMINI_AGY_BIN,
ASIDE_GEMINI_AGY_ARGS, ASIDE_GEMINI_AGY_MODEL, ASIDE_GEMINI_AGY_MCP_CONFIG,
ASIDE_GEMINI_PORT, ASIDE_GEMINI_API_KEY, ASIDE_BIN, ASIDE_REPL_ARGS, ASIDE_LOCAL_MODEL_URL.
See docs/LOCAL_BRIDGE.md.`;

export function buildBackends(config: BridgeConfig): GeminiBackend[] {
  return config.backends.map((id) =>
    id === "gemini-web"
      ? new GeminiWebBackend({ cdpUrl: config.cdpUrl, geminiUrl: config.geminiUrl, timeoutMs: config.timeoutMs })
      : new AgyBackend({ bin: config.agyBin, args: config.agyArgs, model: config.agyModel, timeoutMs: config.timeoutMs }),
  );
}

const log = (line: string) => process.stderr.write(`${line}\n`);

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const config = loadConfig();

  switch (command) {
    case "chrome": {
      const chrome = findChrome(config.chromePath);
      if (!chrome) {
        log("Chrome/Edge not found. Set ASIDE_GEMINI_CHROME_PATH.");
        return 1;
      }
      if ((await cdpVersion(config.cdpUrl)).ok) {
        log(`Chrome is already listening on ${config.cdpUrl}.`);
        return 0;
      }
      await launchChrome(chrome, config.chromeProfileDir, config.chromePort, `${config.geminiUrl}/app`);
      log(`Launched ${chrome}\nprofile: ${config.chromeProfileDir}\nSign in to Gemini once in that window; the profile keeps the session.`);
      return 0;
    }

    case "ask": {
      const { values, positionals } = parseArgs({
        args: rest,
        allowPositionals: true,
        options: {
          mode: { type: "string" },
          file: { type: "string", multiple: true },
          gem: { type: "string" },
          continue: { type: "string" },
          json: { type: "boolean" },
        },
      });
      const prompt = positionals.join(" ").trim() || (process.stdin.isTTY ? "" : (await readStdin()).trim());
      if (!prompt) {
        log(USAGE);
        return 2;
      }
      const router = new GeminiRouter(buildBackends(config));
      try {
        const result = await router.ask({
          prompt,
          mode: values.mode,
          files: values.file,
          gem: values.gem,
          conversationUrl: values.continue,
        });
        if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        else if (result.status === "completed") {
          process.stdout.write(`${result.text ?? ""}\n`);
          log(`\n[${result.backend}${result.model ? ` · ${result.model}` : ""}${result.url ? ` · ${result.url}` : ""}]`);
        } else {
          log(`Gemini ${result.status}: ${result.notes.join("; ")}`);
          for (const attempt of result.attempts) log(`  ${attempt.backend}: ${attempt.status}${attempt.note ? ` — ${attempt.note}` : ""}`);
        }
        return result.status === "completed" ? 0 : 1;
      } finally {
        await router.close();
      }
    }

    case "serve": {
      const { values } = parseArgs({ args: rest, options: { port: { type: "string" }, host: { type: "string" } } });
      const host = values.host ?? config.serverHost;
      const port = values.port ? Number(values.port) : config.serverPort;
      if (!["127.0.0.1", "localhost", "::1"].includes(host) && !config.apiKey) {
        log("Refusing to listen beyond loopback without ASIDE_GEMINI_API_KEY.");
        return 2;
      }
      const router = new GeminiRouter(buildBackends(config));
      const server = createOpenAIServer({ router, apiKey: config.apiKey, modes: ["pro", "thinking", "fast"] });
      server.listen(port, host, () => log(`OpenAI-compatible Gemini bridge on http://${host}:${port}/v1 (backends: ${config.backends.join(" → ")})`));
      await new Promise<void>((resolve) => {
        const stop = () => server.close(() => resolve());
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
      });
      await router.close();
      return 0;
    }

    case "mcp": {
      const router = new GeminiRouter(buildBackends(config));
      await serveMcp(router);
      await router.close();
      return 0;
    }

    case "doctor": {
      const rows: Array<[string, boolean, string]> = [];
      const chrome = findChrome(config.chromePath);
      rows.push(["chrome binary", Boolean(chrome), chrome ?? "not found (set ASIDE_GEMINI_CHROME_PATH)"]);
      const cdp = await cdpVersion(config.cdpUrl);
      rows.push([`chrome devtools ${config.cdpUrl}`, cdp.ok, cdp.ok ? cdp.detail : `${cdp.detail} — run: aside-gpt chrome`]);
      const router = new GeminiRouter(buildBackends({ ...config, backends: ["gemini-web", "agy"] }));
      for (const status of await router.status()) rows.push([`backend ${status.backend}`, status.available, status.detail]);
      await router.close();
      const aside = await runProcess(config.asideBin, ["--version"], { timeoutMs: 15_000, allowShellShim: true });
      rows.push(["aside cli", aside.code === 0, aside.spawnError ?? (aside.stdout || aside.stderr).trim().split("\n")[0] ?? ""]);
      if (config.localModelUrl) {
        const health = await new LocalModelClient({ baseUrl: config.localModelUrl, timeoutMs: 5_000 }).healthCheck();
        rows.push(["local model", health.available, health.available ? health.models.join(", ") || "no models" : health.error ?? "unavailable"]);
      } else {
        rows.push(["local model", false, "ASIDE_LOCAL_MODEL_URL not set (e.g. http://127.0.0.1:11434/v1 for Ollama)"]);
      }
      for (const [name, ok, detail] of rows) process.stdout.write(`${ok ? "OK  " : "--  "}${name.padEnd(40)} ${detail}\n`);
      process.stdout.write(`\nbackend order: ${config.backends.join(" → ")}\n`);
      return rows.some(([name, ok]) => name.startsWith("backend") && ok) ? 0 : 1;
    }

    case "probe-aside": {
      const { values } = parseArgs({ args: rest, options: { script: { type: "string" } } });
      const script = values.script ? await readFile(values.script, "utf8") : DEFAULT_PROBE_SCRIPT;
      log(`Running: ${config.asideBin} ${config.asideReplArgs.join(" ")} (script on stdin)`);
      const result = await probeAside(config.asideBin, config.asideReplArgs, script);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return result.verdict === "no-credit-signal" ? 0 : 1;
    }

    case "setup-agy": {
      const { values } = parseArgs({ args: rest, options: { "dry-run": { type: "boolean" }, config: { type: "string" } } });
      const cliPath = __filename;
      const entries = agyMcpEntries(process.execPath, cliPath, config.asideBin);
      const outcome = await mergeMcpConfig(values.config ?? config.agyMcpConfigPath, entries, { dryRun: values["dry-run"] === true });
      process.stdout.write(`${JSON.stringify(outcome.config, null, 2)}\n`);
      log(values["dry-run"] ? `(dry run) would write ${outcome.path}` : `wrote ${outcome.path}${outcome.backup ? ` (backup: ${outcome.backup})` : ""}`);
      if (cliPath.endsWith(".ts")) log("note: the entry points at a .ts file; run `npm run build` and use dist/ for a stable path.");
      return 0;
    }

    default:
      log(USAGE);
      return command === undefined || command === "help" || command === "--help" ? 0 : 2;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error: unknown) => {
      log(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
