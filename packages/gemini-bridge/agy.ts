import { spawn } from "node:child_process";
import {
  failure,
  type GeminiAskRequest,
  type GeminiAskResult,
  type GeminiBackend,
  type GeminiBackendStatus,
} from "./types.js";

export interface AgyOptions {
  bin: string;
  /** Args template. `{prompt}` is replaced by the prompt; without it the prompt goes to stdin. */
  args: readonly string[];
  model?: string | undefined;
  timeoutMs: number;
}

export interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError?: string;
}

const MAX_OUTPUT = 4 * 1024 * 1024;

/**
 * Runs a command without a shell. Windows .cmd/.bat shims need a shell, so they
 * are only allowed when nothing user-controlled is on the command line.
 */
export function runProcess(
  bin: string,
  args: readonly string[],
  options: { stdin?: string; timeoutMs: number; allowShellShim?: boolean },
): Promise<ProcessResult> {
  const shim = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(bin);
  if (shim && !options.allowShellShim) {
    return Promise.resolve({
      code: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      spawnError: `${bin} is a shell shim; point the binary setting at the .exe, or pass the prompt via stdin (remove {prompt} from the args template)`,
    });
  }
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const child = spawn(bin, [...args], { windowsHide: true, shell: shim, stdio: ["pipe", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT) stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT) stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr, timedOut, spawnError: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(options.stdin ?? "");
  });
}

/** Official path: Antigravity CLI in non-interactive print mode. */
export class AgyBackend implements GeminiBackend {
  readonly id = "agy" as const;

  constructor(private readonly options: AgyOptions) {}

  async status(): Promise<GeminiBackendStatus> {
    const result = await runProcess(this.options.bin, ["--version"], { timeoutMs: 15_000, allowShellShim: true });
    if (result.spawnError) return { backend: this.id, available: false, detail: `${this.options.bin}: ${result.spawnError}` };
    if (result.code !== 0) return { backend: this.id, available: false, detail: `--version exited with ${result.code}` };
    return { backend: this.id, available: true, detail: (result.stdout || result.stderr).trim().split("\n")[0] ?? "ok" };
  }

  async ask(request: GeminiAskRequest): Promise<GeminiAskResult> {
    const startedAt = Date.now();
    if (!request.prompt.trim()) return failure(this.id, "error", "prompt must not be empty", startedAt);
    if (request.files?.length || request.gem || request.conversationUrl) {
      return failure(this.id, "error", "agy backend does not support files, Gems, or conversation URLs", startedAt);
    }
    const inline = this.options.args.includes("{prompt}");
    const args = this.options.args.map((arg) => (arg === "{prompt}" ? request.prompt : arg));
    const model = request.mode ?? this.options.model;
    if (model) args.unshift("--model", model);

    const result = await runProcess(this.options.bin, args, {
      timeoutMs: request.timeoutMs ?? this.options.timeoutMs,
      allowShellShim: !inline,
      ...(inline ? {} : { stdin: request.prompt }),
    });
    if (result.spawnError) return failure(this.id, "error", result.spawnError, startedAt);
    if (result.timedOut) return failure(this.id, "error", "agy timed out", startedAt);
    const text = result.stdout.trim();
    if (result.code !== 0 || !text) {
      const detail = (result.stderr || result.stdout).trim().slice(-500);
      const status = /quota|rate.?limit|429|exhausted/i.test(detail) ? "blocked" : /log ?in|auth/i.test(detail) ? "needs-signin" : "error";
      return failure(this.id, status, `agy exited with ${result.code}: ${detail || "no output"}`, startedAt);
    }
    request.onProgress?.(text);
    return {
      backend: this.id,
      status: "completed",
      text,
      ...(model ? { model } : {}),
      notes: [],
      elapsedMs: Date.now() - startedAt,
    };
  }
}
