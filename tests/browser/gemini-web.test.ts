/**
 * Drives the real GeminiWebBackend against tests/fixtures/fake-gemini.html in a
 * headless Chromium reached over CDP, exactly as production reaches the user's
 * Chrome. Run with `npm run test:browser` (needs a Chromium binary; set
 * CHROME_PATH if it is not at a known location).
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";
import { GeminiWebBackend } from "../../packages/gemini-bridge/gemini-web.js";

function playwrightChromium(): string | undefined {
  try {
    return chromium.executablePath();
  } catch {
    return undefined;
  }
}

const CHROME = [process.env.CHROME_PATH, playwrightChromium(), "/usr/bin/chromium", "/usr/bin/google-chrome"].find(
  (path): path is string => Boolean(path && existsSync(path)),
);

let server: Server;
let origin = "";
let chrome: ChildProcess;
let profile = "";
let cdpUrl = "";

before(async () => {
  assert.ok(CHROME, "No Chromium found; set CHROME_PATH");
  const fixture = await readFile(join(__dirname, "..", "fixtures", "fake-gemini.html"), "utf8");
  server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    res.setHeader("content-type", "text/html; charset=utf-8");
    if (path.startsWith("/signedout/")) {
      res.end('<html><body><a href="https://accounts.google.com/ServiceLogin?continue=x" aria-label="Sign in">Sign in</a></body></html>');
    } else {
      res.end(fixture);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  origin = `http://127.0.0.1:${address.port}`;

  profile = await mkdtemp(join(tmpdir(), "aside-gpt-chrome-"));
  chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let stderr = "";
  chrome.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 300 && !existsSync(portFile) && chrome.exitCode === null; i += 1) {
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(existsSync(portFile), `Chromium (${CHROME}) did not open a DevTools port:\n${stderr.slice(-2000)}`);
  const port = (await readFile(portFile, "utf8")).split("\n")[0];
  cdpUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  chrome?.kill();
  server?.close();
  if (profile) await rm(profile, { recursive: true, force: true }).catch(() => undefined);
});

function backend(geminiUrl = origin) {
  return new GeminiWebBackend({ cdpUrl, geminiUrl, timeoutMs: 20_000, stableMs: 300, pollMs: 50 });
}

test("asks, streams progress, and returns the final answer with the conversation URL", async () => {
  const web = backend();
  const progress: string[] = [];
  try {
    const result = await web.ask({ prompt: "hello there friend", onProgress: (text) => progress.push(text) });
    assert.equal(result.status, "completed", result.notes.join("; "));
    assert.equal(result.text, "ECHO: hello there friend [mode: Fast]");
    assert.equal(result.model, "Fast");
    assert.match(result.url ?? "", /\/app\/c\d+$/);
    assert.ok(progress.length > 1, "expected incremental progress callbacks");

    const followUp = await web.ask({ prompt: "second", conversationUrl: result.url, newChat: false });
    assert.equal(followUp.status, "completed");
    assert.equal(followUp.text, "ECHO: second [mode: Fast]");
  } finally {
    await web.close();
  }
});

test("selects a mode, attaches files, and refuses unknown modes", async () => {
  const web = backend();
  const file = join(profile, "notes.txt");
  await writeFile(file, "attached");
  try {
    const pro = await web.ask({ prompt: "with pro", mode: "pro", files: [file] });
    assert.equal(pro.status, "completed", pro.notes.join("; "));
    assert.equal(pro.text, "ECHO: with pro [mode: Pro] [files: notes.txt]");
    assert.equal(pro.model, "Pro");

    const missing = await web.ask({ prompt: "x", mode: "Ultra 9000" });
    assert.equal(missing.status, "error");
    assert.match(missing.notes[0] ?? "", /not offered; available: Fast \/ Thinking \/ Pro/);
  } finally {
    await web.close();
  }
});

test("preserves code blocks, lists, tables, and links as Markdown", async () => {
  const web = backend();
  try {
    const result = await web.ask({ prompt: "RICH please" });
    assert.equal(result.status, "completed", result.notes.join("; "));
    assert.equal(
      result.text,
      [
        "## Plan",
        "Use **bold** and `inline()` here.",
        "```python\ndef f(x):\n    return x * 2\n```",
        "- first\n  - nested\n- second",
        "| Name | Score |\n| --- | --- |\n| a\\|b | 1 |\n| c | 2 |",
        "See [the doc](https://example.com/doc).",
      ].join("\n\n"),
    );
    assert.deepEqual(result.sources, ["https://example.com/doc"]);
  } finally {
    await web.close();
  }
});

test("reports usage limits as blocked and signed-out profiles as needs-signin", async () => {
  const web = backend();
  try {
    const limited = await web.ask({ prompt: "LIMIT now" });
    assert.equal(limited.status, "blocked");
  } finally {
    await web.close();
  }
  const signedOut = backend(`${origin}/signedout`);
  try {
    const result = await signedOut.ask({ prompt: "hi" });
    assert.equal(result.status, "needs-signin");
    const status = await signedOut.status();
    assert.equal(status.available, false);
  } finally {
    await signedOut.close();
  }
});
