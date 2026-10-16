import assert from "node:assert/strict";
import { chmod, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { after, before, test } from "node:test";
import {
  AgyBackend,
  agyMcpEntries,
  assertLoopbackCdp,
  classifyAsideProbe,
  createOpenAIServer,
  GeminiRouter,
  GeminiWebBackend,
  GeminiWebProvider,
  handleMcpMessage,
  loadConfig,
  mergeMcpConfig,
  messagesToPrompt,
  parseModel,
  serveMcp,
  type GeminiAskRequest,
  type GeminiAskResult,
  type GeminiBackend,
  type GeminiBackendId,
} from "../packages/index.js";

class FakeBackend implements GeminiBackend {
  readonly calls: GeminiAskRequest[] = [];
  constructor(
    readonly id: GeminiBackendId,
    private readonly reply: (request: GeminiAskRequest) => Partial<GeminiAskResult>,
  ) {}
  async status() {
    return { backend: this.id, available: true, detail: "fake" };
  }
  async ask(request: GeminiAskRequest): Promise<GeminiAskResult> {
    this.calls.push(request);
    return { backend: this.id, status: "completed", notes: [], elapsedMs: 1, ...this.reply(request) };
  }
}

let dir = "";
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "aside-gpt-bridge-"));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

test("config defaults to gemini-web then agy and validates backend names", () => {
  const config = loadConfig({});
  assert.deepEqual(config.backends, ["gemini-web", "agy"]);
  assert.equal(config.cdpUrl, "http://127.0.0.1:9223");
  assert.deepEqual(config.agyArgs, ["--print", "{prompt}"]);
  assert.deepEqual(loadConfig({ ASIDE_GEMINI_BACKENDS: "agy, gemini-web" }).backends, ["agy", "gemini-web"]);
  assert.throws(() => loadConfig({ ASIDE_GEMINI_BACKENDS: "gemini-web,web2api" }), /unknown backend "web2api"/);
  assert.throws(() => loadConfig({ ASIDE_GEMINI_PORT: "abc" }), /positive integer/);
});

test("the Chrome DevTools endpoint must stay on loopback", () => {
  assert.doesNotThrow(() => assertLoopbackCdp("http://localhost:9222"));
  assert.throws(() => assertLoopbackCdp("http://192.168.0.10:9222"), /loopback/);
  assert.throws(() => new GeminiWebBackend({ cdpUrl: "http://example.com:9222", geminiUrl: "https://gemini.google.com", timeoutMs: 1 }), /loopback/);
});

// ---------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------

test("router fails closed instead of crossing provider boundaries", async () => {
  const web = new FakeBackend("gemini-web", () => ({ status: "blocked", notes: ["usage limit"] }));
  const agy = new FakeBackend("agy", (request) => ({ text: `agy:${request.prompt}` }));
  const result = await new GeminiRouter([web, agy]).ask({ prompt: "hi" });
  assert.equal(result.status, "blocked");
  assert.equal(result.backend, "gemini-web");
  assert.equal(agy.calls.length, 0);
  assert.deepEqual(result.attempts, [{ backend: "gemini-web", status: "blocked", note: "usage limit" }]);
});

test("router does not splice a second answer after partial streaming", async () => {
  const web: GeminiBackend = {
    id: "gemini-web",
    status: async () => ({ backend: "gemini-web", available: true, detail: "" }),
    ask: async (request) => {
      request.onProgress?.("partial");
      return { backend: "gemini-web", status: "error", text: "partial", notes: ["timeout"], elapsedMs: 1 };
    },
  };
  const agy = new FakeBackend("agy", () => ({ text: "other" }));
  const result = await new GeminiRouter([web, agy]).ask({ prompt: "x", onProgress: () => undefined });
  assert.equal(result.status, "error");
  assert.equal(agy.calls.length, 0);
});

// ---------------------------------------------------------------------------
// OpenAI-compatible server
// ---------------------------------------------------------------------------

test("messages collapse into one prompt; model ids carry the mode", () => {
  assert.equal(messagesToPrompt([{ role: "user", content: "just this" }]), "just this");
  assert.equal(
    messagesToPrompt([
      { role: "system", content: "be brief" },
      { role: "user", content: [{ type: "text", text: "hi" }, { type: "image_url" }] },
    ]),
    "System: be brief\n\nUser: hi\n\nAssistant:",
  );
  assert.deepEqual(parseModel("auto"), { id: "gemini-web", backend: "gemini-web" });
  assert.deepEqual(parseModel("gemini-web:pro"), { id: "gemini-web:pro", mode: "pro", backend: "gemini-web" });
  assert.deepEqual(parseModel(undefined), { id: "gemini-web", backend: "gemini-web" });
  assert.deepEqual(parseModel("agy"), { id: "agy" });
});

async function withServer(
  router: GeminiRouter,
  apiKey: string | undefined,
  run: (base: string) => Promise<void>,
): Promise<void> {
  const server = createOpenAIServer({ router, apiKey, modes: ["pro"] });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("OpenAI server lists models, completes, maps errors, and enforces the API key", async () => {
  const backend = new FakeBackend("gemini-web", (request) =>
    request.prompt === "limit" ? { status: "blocked", notes: ["usage limit"] } : { text: `answer to ${request.prompt}`, url: "https://gemini.google.com/app/1" },
  );
  await withServer(new GeminiRouter([backend]), "secret", async (base) => {
    const headers = { authorization: "Bearer secret", "content-type": "application/json" };
    assert.equal((await fetch(`${base}/v1/models`)).status, 401);

    const models = (await (await fetch(`${base}/v1/models`, { headers })).json()) as { data: Array<{ id: string }> };
    assert.deepEqual(models.data.map((model) => model.id), ["auto", "gemini-web", "gemini-web:pro"]);

    const ok = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: "gemini-web:pro", messages: [{ role: "user", content: "q" }] }),
    });
    const body = (await ok.json()) as { choices: Array<{ message: { content: string } }>; gemini: { url: string } };
    assert.equal(ok.status, 200);
    assert.equal(body.choices[0]?.message.content, "answer to q");
    assert.equal(body.gemini.url, "https://gemini.google.com/app/1");
    assert.equal(backend.calls.at(-1)?.mode, "pro");

    const limited = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: [{ role: "user", content: "limit" }] }),
    });
    assert.equal(limited.status, 429);

    const bad = await fetch(`${base}/v1/chat/completions`, { method: "POST", headers, body: "{" });
    assert.equal(bad.status, 400);
  });
});

test("auto always selects Gemini Web, even when agy is first", async () => {
  const agy = new FakeBackend("agy", () => ({ text: "from agy" }));
  const web = new FakeBackend("gemini-web", () => ({ text: "from web" }));
  await withServer(new GeminiRouter([agy, web]), undefined, async (base) => {
    for (const model of ["auto", "gemini-web", "gemini-web:pro"]) {
      const response = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "probe" }] }),
      });
      assert.equal(response.status, 200);
      const content = (await response.json()) as { choices: Array<{ message: { content: string } }> };
      assert.equal(content.choices[0]?.message.content, "from web");
    }
  });
  assert.equal(agy.calls.length, 0);
  assert.equal(web.calls.length, 3);
});

test("OpenAI server rejects agy models on the Gemini Web bridge", async () => {
  const web = new FakeBackend("gemini-web", () => ({ text: "from web" }));
  const agy = new FakeBackend("agy", (request) => ({ text: `agy:${request.prompt}` }));
  await withServer(new GeminiRouter([web, agy]), undefined, async (base) => {
    const models = (await (await fetch(`${base}/v1/models`)).json()) as { data: Array<{ id: string }> };
    assert.deepEqual(models.data.map((model) => model.id), ["auto", "gemini-web", "gemini-web:pro"]);

    const provider = new GeminiWebProvider({ baseUrl: `${base}/v1` });
    const rejected = await provider.ask({ prompt: "Return exactly: ASIDE_AGY_OK", mode: "oracle", model: "agy" });
    assert.equal(rejected.status, "error");
    assert.match(rejected.notes?.[0] ?? "", /400/);
    assert.equal(agy.calls.length, 0);
  });

  await withServer(new GeminiRouter([web]), undefined, async (base) => {
    const response = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "agy", messages: [{ role: "user", content: "q" }] }),
    });
    assert.equal(response.status, 400);
    assert.equal(web.calls.length, 0);
  });
});

test("OpenAI server streams append-only deltas as server-sent events", async () => {
  const backend: GeminiBackend = {
    id: "gemini-web",
    status: async () => ({ backend: "gemini-web", available: true, detail: "" }),
    ask: async (request) => {
      request.onProgress?.("Hel");
      request.onProgress?.("Hello wor");
      return { backend: "gemini-web", status: "completed", text: "Hello world", notes: [], elapsedMs: 1 };
    },
  };
  await withServer(new GeminiRouter([backend]), undefined, async (base) => {
    const response = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stream: true, messages: [{ role: "user", content: "hi" }] }),
    });
    assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
    const events = (await response.text()).split("\n\n").filter(Boolean).map((event) => event.replace(/^data: /, ""));
    assert.equal(events.at(-1), "[DONE]");
    const chunks = events.slice(0, -1).map((event) => JSON.parse(event) as { choices: Array<{ delta: { content?: string }; finish_reason: string | null }> });
    assert.equal(chunks.map((chunk) => chunk.choices[0]?.delta.content ?? "").join(""), "Hello world");
    assert.equal(chunks.at(-1)?.choices[0]?.finish_reason, "stop");
  });
});

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

test("MCP server exposes gemini_ask and gemini_status", async () => {
  const backend = new FakeBackend("gemini-web", (request) => ({ text: `A:${request.prompt}`, url: "https://gemini.google.com/app/9", model: "Pro" }));
  const router = new GeminiRouter([backend]);

  const init = (await handleMcpMessage(router, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } })) as {
    result: { protocolVersion: string; capabilities: object };
  };
  assert.equal(init.result.protocolVersion, "2025-03-26");
  assert.equal(await handleMcpMessage(router, { jsonrpc: "2.0", method: "notifications/initialized" }), undefined);

  const list = (await handleMcpMessage(router, { jsonrpc: "2.0", id: 2, method: "tools/list" })) as { result: { tools: Array<{ name: string }> } };
  assert.deepEqual(list.result.tools.map((tool) => tool.name), ["gemini_ask", "gemini_status"]);

  const call = (await handleMcpMessage(router, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "gemini_ask", arguments: { prompt: "q", mode: "Pro", conversation_url: "https://gemini.google.com/app/9", new_chat: false } },
  })) as { result: { content: Array<{ text: string }>; isError?: boolean } };
  assert.equal(call.result.isError, undefined);
  assert.match(call.result.content[0]?.text ?? "", /^A:q\n\n---\nbackend: gemini-web\nmode: Pro\nconversation_url: https:\/\/gemini.google.com\/app\/9$/);
  assert.equal(backend.calls[0]?.conversationUrl, "https://gemini.google.com/app/9");
  assert.equal(backend.calls[0]?.newChat, false);

  const missing = (await handleMcpMessage(router, { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "gemini_ask", arguments: {} } })) as {
    result: { isError: boolean };
  };
  assert.equal(missing.result.isError, true);

  const unknown = (await handleMcpMessage(router, { jsonrpc: "2.0", id: 5, method: "nope" })) as { error: { code: number } };
  assert.equal(unknown.error.code, -32601);
});

test("MCP stdio loop answers newline-delimited JSON-RPC", async () => {
  const router = new GeminiRouter([new FakeBackend("gemini-web", () => ({ text: "x" }))]);
  const input = new PassThrough();
  const output = new PassThrough();
  const chunks: string[] = [];
  output.on("data", (chunk) => chunks.push(chunk.toString()));
  const done = serveMcp(router, input, output);
  input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" })}\nnot json\n`);
  input.end();
  await done;
  const lines: string[] = chunks.join("").trim().split("\n");
  assert.equal(lines.length, 2);
  const parsed = lines.map((line) => JSON.parse(line) as { id: number | null; error?: { code: number } });
  assert.ok(parsed.some((message) => message.id === 1));
  assert.ok(parsed.some((message) => message.error?.code === -32700));
});

// ---------------------------------------------------------------------------
// agy backend
// ---------------------------------------------------------------------------

async function fakeAgy(body: string): Promise<string> {
  const path = join(dir, `agy-${Math.random().toString(36).slice(2)}.js`);
  await writeFile(path, `#!/usr/bin/env node\n${body}\n`);
  await chmod(path, 0o755);
  return path;
}

test("agy backend passes the prompt as an argument or on stdin", { skip: process.platform === "win32" }, async () => {
  const bin = await fakeAgy(
    `const args = process.argv.slice(2);
     if (args[0] === "--version") { console.log("agy 1.2.3"); process.exit(0); }
     let input = ""; process.stdin.on("data", (d) => (input += d)).on("end", () => console.log(JSON.stringify({ args, input })));`,
  );
  const inline = new AgyBackend({ bin, args: ["--print", "{prompt}"], model: "gemini-3-pro", timeoutMs: 10_000 });
  assert.deepEqual(await inline.status(), { backend: "agy", available: true, detail: "agy 1.2.3" });
  const first = await inline.ask({ prompt: "hello; rm -rf /" });
  assert.equal(first.status, "completed");
  assert.deepEqual(JSON.parse(first.text ?? ""), { args: ["--model", "gemini-3-pro", "--print", "hello; rm -rf /"], input: "" });

  const piped = new AgyBackend({ bin, args: ["--print"], timeoutMs: 10_000 });
  const second = await piped.ask({ prompt: "via stdin" });
  assert.deepEqual(JSON.parse(second.text ?? ""), { args: ["--print"], input: "via stdin" });

  const unsupported = await inline.ask({ prompt: "x", files: ["a.txt"] });
  assert.equal(unsupported.status, "error");
});

test("agy backend classifies quota and missing binaries", { skip: process.platform === "win32" }, async () => {
  const quota = await fakeAgy(`console.error("Error 429: quota exhausted"); process.exit(1);`);
  const result = await new AgyBackend({ bin: quota, args: ["{prompt}"], timeoutMs: 10_000 }).ask({ prompt: "x" });
  assert.equal(result.status, "blocked");

  const missing = await new AgyBackend({ bin: join(dir, "does-not-exist"), args: ["{prompt}"], timeoutMs: 10_000 }).ask({ prompt: "x" });
  assert.equal(missing.status, "error");
  assert.match(missing.notes[0] ?? "", /ENOENT/);
});

// ---------------------------------------------------------------------------
// host helpers
// ---------------------------------------------------------------------------

test("Aside REPL probe reports credit errors, clean runs, and missing CLI", () => {
  const base = { code: 0, stdout: "", stderr: "", timedOut: false };
  assert.equal(classifyAsideProbe({ ...base, code: 1, stderr: "HTTP 402 Payment Required" }).verdict, "credits-required");
  assert.equal(classifyAsideProbe({ ...base, stdout: "ASIDE_REPL_OK Gemini" }).verdict, "no-credit-signal");
  assert.equal(classifyAsideProbe({ ...base, code: null, spawnError: "spawn aside ENOENT" }).verdict, "aside-unavailable");
  assert.equal(classifyAsideProbe({ ...base, code: 1, stderr: "SyntaxError" }).verdict, "inconclusive");
});

test("setup-agy merges MCP servers, keeps existing ones, and backs up the file", async () => {
  const path = join(dir, "agy", "mcp_config.json");
  const entries = agyMcpEntries("/usr/bin/node", "/opt/aside-gpt/cli.js", "aside");
  assert.deepEqual(entries["aside-gpt-gemini"]?.env, { ASIDE_GEMINI_BACKENDS: "gemini-web" });

  const dry = await mergeMcpConfig(path, entries, { dryRun: true });
  assert.ok(dry.config.mcpServers);
  await assert.rejects(readFile(path));

  await mergeMcpConfig(path, { other: { command: "x", args: [] } });
  const written = await mergeMcpConfig(path, entries);
  assert.ok(written.backup);
  const saved = JSON.parse(await readFile(path, "utf8")) as { mcpServers: Record<string, unknown> };
  assert.deepEqual(Object.keys(saved.mcpServers).sort(), ["aside", "aside-gpt-gemini", "other"]);
  assert.equal((await readdir(join(dir, "agy"))).filter((name) => name.includes(".bak-")).length, 1);

  await writeFile(path, "{ broken");
  await assert.rejects(mergeMcpConfig(path, entries), /not valid JSON/);
});
