import { access } from "node:fs/promises";
import type { Browser, Locator, Page } from "playwright-core";
import { assertLoopbackCdp } from "./config.js";
import { DOM_TO_MARKDOWN_SOURCE } from "./markdown.js";
import { LIMIT_PATTERNS, SELECTORS } from "./selectors.js";
import {
  failure,
  type GeminiAskRequest,
  type GeminiAskResult,
  type GeminiBackend,
  type GeminiBackendStatus,
} from "./types.js";

export interface GeminiWebOptions {
  cdpUrl: string;
  /** Origin of the Gemini site; tests point this at a local fixture. */
  geminiUrl: string;
  timeoutMs: number;
  /** A response counts as finished after this long without change and no stop button. */
  stableMs?: number;
  pollMs?: number;
  connect?: (cdpUrl: string) => Promise<Browser>;
}

type SelectorList = readonly string[];

class StepError extends Error {
  constructor(
    readonly status: "needs-signin" | "blocked" | "error",
    message: string,
  ) {
    super(message);
  }
}

// Built from source text so Playwright ships it verbatim over CDP, untouched by
// transpiler helpers and outside the page's CSP.
const domToMarkdown = new Function(`return ${DOM_TO_MARKDOWN_SOURCE}`)() as (
  element: Element,
) => { markdown: string; sources: string[] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function defaultConnect(cdpUrl: string): Promise<Browser> {
  const { chromium } = await import("playwright-core");
  return chromium.connectOverCDP(cdpUrl);
}

/**
 * Drives gemini.google.com in an already signed-in Chrome profile, through the
 * visible page only. Requests are serialized because one tab is shared.
 */
export class GeminiWebBackend implements GeminiBackend {
  readonly id = "gemini-web" as const;
  private browser: Browser | undefined;
  private page: Page | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly stableMs: number;
  private readonly pollMs: number;
  private readonly connect: (cdpUrl: string) => Promise<Browser>;

  constructor(private readonly options: GeminiWebOptions) {
    assertLoopbackCdp(options.cdpUrl);
    this.stableMs = options.stableMs ?? 1_500;
    this.pollMs = options.pollMs ?? 250;
    this.connect = options.connect ?? defaultConnect;
  }

  async status(): Promise<GeminiBackendStatus> {
    return this.serialize(async () => {
      try {
        const page = await this.getPage();
        if (!page.url().startsWith(this.options.geminiUrl)) {
          await page.goto(`${this.options.geminiUrl}/app`, { waitUntil: "domcontentloaded" });
        }
        if (await this.signedOut(page)) {
          return { backend: this.id, available: false, detail: "Chrome is reachable but Gemini is signed out" };
        }
        const input = await this.waitFirst(page, SELECTORS.input, 15_000);
        if (!input) {
          return { backend: this.id, available: false, detail: "Gemini page loaded but the prompt editor was not found (check SELECTORS.input)" };
        }
        const mode = await this.currentMode(page);
        return { backend: this.id, available: true, detail: `signed in${mode ? `, mode: ${mode}` : ""}` };
      } catch (error) {
        return { backend: this.id, available: false, detail: describe(error) };
      }
    });
  }

  ask(request: GeminiAskRequest): Promise<GeminiAskResult> {
    return this.serialize(() => this.askNow(request));
  }

  async close(): Promise<void> {
    // Only drop the CDP connection; the user's Chrome keeps running.
    const browser = this.browser;
    this.browser = undefined;
    this.page = undefined;
    if (browser) await browser.close().catch(() => undefined);
  }

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async getPage(): Promise<Page> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await this.connect(this.options.cdpUrl);
      this.page = undefined;
    }
    if (this.page && !this.page.isClosed()) return this.page;
    const context = this.browser.contexts()[0];
    if (!context) throw new Error("Chrome exposed no browser context over CDP");
    this.page =
      context.pages().find((page) => page.url().startsWith(this.options.geminiUrl)) ??
      (await context.newPage());
    return this.page;
  }

  private async askNow(request: GeminiAskRequest): Promise<GeminiAskResult> {
    const startedAt = Date.now();
    if (!request.prompt.trim()) return failure(this.id, "error", "prompt must not be empty", startedAt);
    const timeoutMs = request.timeoutMs ?? this.options.timeoutMs;
    const deadline = startedAt + timeoutMs;
    let page: Page;
    try {
      page = await this.getPage();
    } catch (error) {
      return failure(this.id, "error", `cannot reach Chrome at ${this.options.cdpUrl}: ${describe(error)}`, startedAt);
    }

    let partial = "";
    try {
      await this.open(page, request);
      if (await this.signedOut(page)) throw new StepError("needs-signin", "Gemini is signed out in the automation profile");
      const input = await this.waitFirst(page, SELECTORS.input, 30_000);
      if (!input) {
        if (await this.signedOut(page)) throw new StepError("needs-signin", "Gemini is signed out in the automation profile");
        throw new StepError("error", "prompt editor not found; update SELECTORS.input in packages/gemini-bridge/selectors.ts");
      }
      const notes: string[] = [];
      if (request.mode) notes.push(...(await this.selectMode(page, request.mode)));
      if (request.files?.length) await this.attach(page, request.files);

      const before = await this.count(page, SELECTORS.response);
      await input.click();
      await page.keyboard.insertText(request.prompt);
      await this.send(page, request.files?.length ? 120_000 : 10_000);

      while ((await this.count(page, SELECTORS.response)) <= before) {
        await this.throwIfLimited(page, "");
        if (Date.now() > deadline) throw new StepError("error", "Gemini did not start a response before the timeout");
        await sleep(this.pollMs);
      }

      let lastChange = Date.now();
      let sources: readonly string[] = [];
      for (;;) {
        const snapshot = await this.readLastResponse(page);
        if (snapshot.markdown !== partial) {
          partial = snapshot.markdown;
          sources = snapshot.sources;
          lastChange = Date.now();
          request.onProgress?.(partial);
        }
        const generating = (await this.first(page, SELECTORS.stop, true)) !== null;
        await this.throwIfLimited(page, partial);
        if (!generating && partial && Date.now() - lastChange >= this.stableMs) break;
        if (Date.now() > deadline) throw new StepError("error", `Gemini response did not finish within ${timeoutMs} ms`);
        await sleep(this.pollMs);
      }

      const model = await this.currentMode(page);
      return {
        backend: this.id,
        status: "completed",
        text: partial,
        url: page.url(),
        ...(model ? { model } : {}),
        ...(sources.length ? { sources } : {}),
        notes,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (error) {
      const status = error instanceof StepError ? error.status : "error";
      return failure(this.id, status, describe(error), startedAt, {
        url: page.url(),
        ...(partial ? { text: partial } : {}),
      });
    }
  }

  private async open(page: Page, request: GeminiAskRequest): Promise<void> {
    const origin = this.options.geminiUrl;
    let target: string | undefined;
    if (request.conversationUrl) {
      if (!request.conversationUrl.startsWith(`${origin}/app/`)) {
        throw new StepError("error", `conversationUrl must start with ${origin}/app/`);
      }
      target = request.conversationUrl;
    } else if (request.gem) {
      if (/^https?:/.test(request.gem)) {
        if (!request.gem.startsWith(`${origin}/gem/`)) throw new StepError("error", `gem URL must start with ${origin}/gem/`);
        target = request.gem;
      } else {
        target = `${origin}/gem/${encodeURIComponent(request.gem)}`;
      }
    } else if (request.newChat !== false || !page.url().startsWith(origin)) {
      target = `${origin}/app`;
    }
    if (target) await page.goto(target, { waitUntil: "domcontentloaded" });
  }

  private async signedOut(page: Page): Promise<boolean> {
    if (new URL(page.url()).hostname === "accounts.google.com") return true;
    return (await this.first(page, SELECTORS.signIn, true)) !== null;
  }

  private async selectMode(page: Page, mode: string): Promise<string[]> {
    const wanted = mode.trim().toLowerCase();
    const current = await this.currentMode(page);
    if (current?.toLowerCase().includes(wanted)) return [];
    const picker = await this.first(page, SELECTORS.modePicker, true);
    if (!picker) throw new StepError("error", "mode picker not found; update SELECTORS.modePicker");
    await picker.click();
    const items = page.locator(SELECTORS.modeItem.join(", "));
    await items.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
    const labels: string[] = [];
    for (let i = 0; i < (await items.count()); i += 1) {
      const item = items.nth(i);
      const label = (await item.innerText()).replace(/\s+/g, " ").trim();
      labels.push(label);
      if (label.toLowerCase().includes(wanted)) {
        await item.click();
        await sleep(300);
        const after = await this.currentMode(page);
        return after?.toLowerCase().includes(wanted) ? [] : [`selected "${label}" but the picker now shows "${after ?? "unknown"}"`];
      }
    }
    await page.keyboard.press("Escape");
    // No silent fallback to another model.
    throw new StepError("error", `mode "${mode}" is not offered; available: ${labels.join(" / ") || "none"}`);
  }

  private async currentMode(page: Page): Promise<string | undefined> {
    const picker = await this.first(page, SELECTORS.modePicker, true);
    const label = picker ? (await picker.innerText()).replace(/\s+/g, " ").trim() : "";
    return label || undefined;
  }

  private async attach(page: Page, files: readonly string[]): Promise<void> {
    for (const file of files) {
      await access(file).catch(() => {
        throw new StepError("error", `file not found: ${file}`);
      });
    }
    const input = await this.first(page, SELECTORS.fileInput, false);
    if (input) {
      await input.setInputFiles([...files]);
      return;
    }
    const menu = await this.first(page, SELECTORS.uploadMenu, true);
    if (!menu) throw new StepError("error", "upload control not found; update SELECTORS.uploadMenu");
    const chooser = page.waitForEvent("filechooser", { timeout: 10_000 });
    await menu.click();
    const item = page.locator(SELECTORS.modeItem.join(", ")).filter({ hasText: /upload files?|파일 업로드/i }).first();
    if (await item.isVisible().catch(() => false)) await item.click();
    await (await chooser).setFiles([...files]);
  }

  private async send(page: Page, waitMs: number): Promise<void> {
    const button = await this.waitFirst(page, SELECTORS.send, waitMs);
    if (button) await button.click();
    else await page.keyboard.press("Enter");
  }

  private async readLastResponse(page: Page): Promise<{ markdown: string; sources: string[] }> {
    const turn = page.locator(SELECTORS.response.join(", ")).last();
    for (const selector of SELECTORS.responseBody) {
      const body = turn.locator(selector).first();
      if ((await body.count()) > 0) {
        return body.evaluate(domToMarkdown);
      }
    }
    return { markdown: "", sources: [] };
  }

  private async throwIfLimited(page: Page, responseText: string): Promise<void> {
    const alerts = await page
      .locator("[role='alert'], mat-snack-bar-container, .snackbar")
      .allInnerTexts()
      .catch(() => [] as string[]);
    // Long answers may legitimately contain these phrases; only short turns are limit notices.
    const candidates = [...alerts, ...(responseText.length < 400 ? [responseText] : [])];
    const hit = candidates.find((text) => LIMIT_PATTERNS.some((pattern) => pattern.test(text)));
    if (hit) throw new StepError("blocked", `Gemini usage limit: ${hit.trim().slice(0, 200)}`);
  }

  private async count(page: Page, selectors: SelectorList): Promise<number> {
    return page.locator(selectors.join(", ")).count();
  }

  private async first(page: Page, selectors: SelectorList, visible: boolean): Promise<Locator | null> {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if ((await locator.count()) === 0) continue;
      if (visible && !(await locator.isVisible().catch(() => false))) continue;
      return locator;
    }
    return null;
  }

  private async waitFirst(page: Page, selectors: SelectorList, timeoutMs: number): Promise<Locator | null> {
    const until = Date.now() + timeoutMs;
    for (;;) {
      const found = await this.first(page, selectors, true);
      if (found || Date.now() > until) return found;
      await sleep(this.pollMs);
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message.split("\n")[0] ?? error.name : String(error);
}
