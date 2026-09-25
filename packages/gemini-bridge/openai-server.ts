import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { GeminiRouter, RoutedResult } from "./router.js";
import type { GeminiBackendId } from "./types.js";

/**
 * OpenAI-compatible façade over the Gemini router.
 *
  * Model ids: "gemini-web" keeps the current Gemini mode; "gemini-web:<mode>"
 * selects a visible mode label first (e.g. "gemini-web:pro"). The Antigravity
 * provider is served separately on port 8765 and is not exposed here.
 * Each request starts a new Gemini chat; prior turns are sent as a transcript.
 */

export interface OpenAIServerOptions {
  router: GeminiRouter;
  apiKey?: string | undefined;
  /** Extra model ids to advertise, e.g. ["gemini-web:pro", "gemini-web:thinking"]. */
  modes?: readonly string[];
  maxBodyBytes?: number;
  port?: number;
}

interface ChatMessage {
  role?: unknown;
  content?: unknown;
}

const BASE_MODEL = "gemini-web";

export function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: { type?: unknown; text?: unknown }) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/** Collapses an OpenAI message list into a single Gemini prompt. */
export function messagesToPrompt(messages: readonly ChatMessage[]): string {
  const turns = messages
    .map((message) => ({ role: String(message.role ?? "user"), text: messageText(message.content).trim() }))
    .filter((turn) => turn.text);
  if (turns.length === 1 && turns[0]?.role === "user") return turns[0].text;
  const label: Record<string, string> = { system: "System", user: "User", assistant: "Assistant", tool: "Tool" };
  return [
    ...turns.map((turn) => `${label[turn.role] ?? turn.role}: ${turn.text}`),
    "Assistant:",
  ].join("\n\n");
}

export function parseModel(model: unknown): { id: string; mode?: string; backend?: GeminiBackendId } {
  const id = typeof model === "string" && model.trim() ? model.trim() : BASE_MODEL;
  const match = /^gemini-web:(.+)$/.exec(id);
  return match?.[1] ? { id, mode: match[1] } : { id };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

function sendError(res: ServerResponse, status: number, message: string, type = "invalid_request_error"): void {
  sendJson(res, status, { error: { message, type, code: null } });
}

function statusFor(result: RoutedResult): number {
  if (result.status === "blocked") return 429;
  if (result.status === "needs-signin") return 401;
  return 502;
}

async function readBody(req: IncomingMessage, limit: number): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new Error("request body too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function authorized(req: IncomingMessage, apiKey: string | undefined): boolean {
  if (!apiKey) return true;
  const header = req.headers.authorization ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(apiKey);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createOpenAIServer(options: OpenAIServerOptions): Server {
  const maxBody = options.maxBodyBytes ?? 4 * 1024 * 1024;
  const models = [
    BASE_MODEL,
    ...(options.modes ?? []).map((mode) => `${BASE_MODEL}:${mode}`),
  ];

  return createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      if (!res.headersSent) sendError(res, 500, error instanceof Error ? error.message : "internal error", "server_error");
      else res.end();
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/$/, "");
    if (!authorized(req, options.apiKey)) return sendError(res, 401, "invalid API key", "authentication_error");

    if (req.method === "GET" && path === "/v1/models") {
      return sendJson(res, 200, {
        object: "list",
        data: models.map((id) => ({ id, object: "model", created: 0, owned_by: "aside-gpt" })),
      });
    }
    if (req.method === "GET" && path === "/health") {
      return sendJson(res, 200, { service: "aside-gpt-gemini-web-bridge", port: options.port ?? 8766, backends: await options.router.status() });
    }
    if (req.method !== "POST" || path !== "/v1/chat/completions") {
      return sendError(res, 404, `no route for ${req.method} ${path}`);
    }

    let body: { model?: unknown; messages?: unknown; stream?: unknown };
    try {
      body = JSON.parse(await readBody(req, maxBody)) as typeof body;
    } catch (error) {
      return sendError(res, 400, error instanceof Error ? error.message : "invalid JSON");
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return sendError(res, 400, "messages must be a non-empty array");
    }
    const prompt = messagesToPrompt(body.messages as ChatMessage[]);
    if (!prompt.trim() || prompt === "Assistant:") return sendError(res, 400, "messages contain no text");
    const { id: model, mode, backend } = parseModel(body.model);
    if (model !== "gemini-web" && !/^gemini-web:.+/.test(model)) {
      return sendError(res, 400, `unsupported model: ${model}; this bridge only serves gemini-web models`);
    }
    const completionId = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);

    if (body.stream !== true) {
      const result = await options.router.ask({ prompt, mode }, backend);
      if (result.status !== "completed") return sendError(res, statusFor(result), result.notes.join("; "), "upstream_error");
      return sendJson(res, 200, {
        id: completionId,
        object: "chat.completion",
        created,
        model,
        choices: [{ index: 0, message: { role: "assistant", content: result.text ?? "" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        gemini: { backend: result.backend, url: result.url, sources: result.sources, attempts: result.attempts },
      });
    }

    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    const chunk = (delta: Record<string, unknown>, finish: string | null) =>
      res.write(
        `data: ${JSON.stringify({ id: completionId, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`,
      );
    chunk({ role: "assistant" }, null);
    let sent = "";
    const emit = (text: string) => {
      // Gemini re-renders markdown while streaming; only append-only growth can be forwarded.
      if (text.startsWith(sent) && text.length > sent.length) {
        chunk({ content: text.slice(sent.length) }, null);
        sent = text;
      }
    };
    const result = await options.router.ask({ prompt, mode, onProgress: emit }, backend);
    if (result.status === "completed") {
      const final = result.text ?? "";
      if (final.startsWith(sent)) emit(final);
      else chunk({ content: `\n\n---\n\n${final}` }, null);
      chunk({}, "stop");
    } else {
      res.write(`data: ${JSON.stringify({ error: { message: result.notes.join("; "), type: "upstream_error", code: statusFor(result) } })}\n\n`);
    }
    res.end("data: [DONE]\n\n");
  }
}
