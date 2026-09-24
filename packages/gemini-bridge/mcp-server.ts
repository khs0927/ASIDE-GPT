import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { GeminiRouter } from "./router.js";

/**
 * Minimal stdio MCP server (newline-delimited JSON-RPC 2.0) exposing
 * `gemini_ask` and `gemini_status`. stdout carries protocol only.
 */

const PROTOCOL_VERSION = "2025-06-18";

export const MCP_TOOLS = [
  {
    name: "gemini_ask",
    description:
      "Ask Gemini (Google AI Pro, via the signed-in gemini.google.com page or the Antigravity CLI) and return its answer as Markdown. " +
      "Use for hard reasoning, long-document analysis, planning, or a second opinion. The answer is advisory text only.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Full prompt to send." },
        mode: { type: "string", description: "Visible Gemini mode label to select, e.g. 'Pro', 'Thinking', 'Fast'." },
        conversation_url: { type: "string", description: "Continue this gemini.google.com/app/... conversation (returned by an earlier call)." },
        new_chat: { type: "boolean", description: "Start a new chat (default true unless conversation_url is set)." },
        files: { type: "array", items: { type: "string" }, description: "Local file paths to attach." },
        gem: { type: "string", description: "Gem id or gemini.google.com/gem/... URL to use." },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "gemini_status",
    description: "Report whether each Gemini backend (gemini-web, agy) is reachable and signed in.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
] as const;

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const str = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value : undefined);

export async function handleMcpMessage(router: GeminiRouter, message: RpcRequest): Promise<unknown | undefined> {
  const { id, method } = message;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const error = (code: number, text: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message: text } });
  const isNotification = id === undefined;

  switch (method) {
    case "initialize": {
      const requested = str(message.params?.protocolVersion);
      return reply({
        protocolVersion: requested ?? PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "aside-gpt-gemini", version: "0.4.0" },
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: MCP_TOOLS });
    case "tools/call": {
      const name = message.params?.name;
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      if (name === "gemini_status") {
        const statuses = await router.status();
        return reply({ content: [{ type: "text", text: JSON.stringify(statuses, null, 2) }] });
      }
      if (name !== "gemini_ask") return error(-32602, `unknown tool: ${String(name)}`);
      const prompt = str(args.prompt);
      if (!prompt) return reply({ content: [{ type: "text", text: "prompt is required" }], isError: true });
      const files = Array.isArray(args.files) ? args.files.filter((file): file is string => typeof file === "string") : undefined;
      const result = await router.ask({
        prompt,
        mode: str(args.mode),
        conversationUrl: str(args.conversation_url),
        newChat: typeof args.new_chat === "boolean" ? args.new_chat : undefined,
        files,
        gem: str(args.gem),
      });
      if (result.status !== "completed") {
        const text = `Gemini ${result.status}: ${result.notes.join("; ")}\nattempts: ${JSON.stringify(result.attempts)}`;
        return reply({ content: [{ type: "text", text }], isError: true });
      }
      const footer = [
        `backend: ${result.backend}`,
        result.model ? `mode: ${result.model}` : "",
        result.url ? `conversation_url: ${result.url}` : "",
      ].filter(Boolean);
      return reply({
        content: [{ type: "text", text: `${result.text ?? ""}\n\n---\n${footer.join("\n")}` }],
        structuredContent: { backend: result.backend, url: result.url, model: result.model, sources: result.sources ?? [] },
      });
    }
    default:
      if (isNotification) return undefined;
      return error(-32601, `method not found: ${String(method)}`);
  }
}

export function serveMcp(router: GeminiRouter, input: Readable = process.stdin, output: Writable = process.stdout): Promise<void> {
  const lines = createInterface({ input, crlfDelay: Infinity });
  const pending = new Set<Promise<void>>();
  lines.on("line", (line) => {
    if (!line.trim()) return;
    const task = (async () => {
      let message: RpcRequest;
      try {
        message = JSON.parse(line) as RpcRequest;
      } catch {
        output.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } })}\n`);
        return;
      }
      try {
        const response = await handleMcpMessage(router, message);
        if (response !== undefined) output.write(`${JSON.stringify(response)}\n`);
      } catch (error) {
        const text = error instanceof Error ? error.message : "internal error";
        output.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id ?? null, error: { code: -32603, message: text } })}\n`);
      }
    })();
    pending.add(task);
    void task.finally(() => pending.delete(task));
  });
  return new Promise((resolve) => {
    lines.on("close", () => {
      void Promise.all(pending).then(() => resolve());
    });
  });
}
