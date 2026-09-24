export interface LocalModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LocalModelCompletionRequest {
  messages: readonly LocalModelMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LocalModelCompletion {
  model: string;
  content: string;
  finishReason?: string;
  conversationUrl?: string;
  backend?: string;
}

export interface LocalModelHealth {
  available: boolean;
  status: number | null;
  models: readonly string[];
  error?: string;
}

export class LocalModelError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "LocalModelError";
  }
}

export interface LocalModelClientOptions {
  /** Must be an http loopback URL. No remote or credential-bearing URL is accepted. */
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function assertLoopbackUrl(value: string): URL {
  const url = new URL(value);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  if (url.protocol !== "http:" || !loopbackHosts.has(url.hostname)) {
    throw new LocalModelError("Local model baseUrl must be an http loopback address", null);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new LocalModelError("Local model baseUrl must not contain credentials, query, or hash", null);
  }
  return url;
}

function boundedBody(body: string): string {
  return body.length > 512 ? `${body.slice(0, 512)}...` : body;
}

/**
 * Small, credential-free client for a local OpenAI-compatible server.
 * It is intentionally limited to loopback HTTP and does not start, download,
 * or configure a model process. The host may use Ollama, LM Studio, or another
 * server that exposes the compatible endpoints.
 */
export class LocalModelClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: LocalModelClientOptions) {
    const normalizedUrl = assertLoopbackUrl(options.baseUrl).toString().replace(/\/$/, "");
    this.baseUrl = normalizedUrl.endsWith("/v1") ? normalizedUrl.slice(0, -3) : normalizedUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new LocalModelError("timeoutMs must be a positive integer", null);
    }
  }

  async healthCheck(): Promise<LocalModelHealth> {
    try {
      const response = await this.request("/v1/models", { method: "GET" });
      if (!response.ok) {
        return {
          available: false,
          status: response.status,
          models: [],
          error: `local model health check returned HTTP ${response.status}`,
        };
      }
      const models = await this.readModels(response);
      return { available: true, status: response.status, models };
    } catch (error) {
      return {
        available: false,
        status: null,
        models: [],
        error: error instanceof Error ? error.message : "local model health check failed",
      };
    }
  }

  async listModels(): Promise<readonly string[]> {
    const response = await this.request("/v1/models", { method: "GET" });
    if (!response.ok) {
      throw new LocalModelError(
        `local model list failed with HTTP ${response.status}: ${boundedBody(await response.text())}`,
        response.status,
      );
    }
    return this.readModels(response);
  }

  async complete(request: LocalModelCompletionRequest): Promise<LocalModelCompletion> {
    if (request.messages.length === 0) {
      throw new LocalModelError("messages must not be empty", null);
    }
    if (request.messages.some((message) => message.content.trim().length === 0)) {
      throw new LocalModelError("message content must not be empty", null);
    }

    const model = request.model?.trim();
    if (request.model !== undefined && !model) {
      throw new LocalModelError("model must not be empty when provided", null);
    }

    const response = await this.request("/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new LocalModelError(
        `local model completion failed with HTTP ${response.status}: ${boundedBody(await response.text())}`,
        response.status,
      );
    }

    const payload = (await response.json()) as {
      model?: unknown;
      choices?: Array<{ finish_reason?: unknown; message?: { content?: unknown } }>;
    };
    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new LocalModelError("local model returned no non-empty message content", response.status);
    }
    const conversationUrl = response.headers.get("X-Conversation-Url") ?? undefined;
    const backend = response.headers.get("X-Backend") ?? undefined;
    return {
      model: typeof payload.model === "string" ? payload.model : model ?? "unknown",
      content,
      ...(typeof choice?.finish_reason === "string" ? { finishReason: choice.finish_reason } : {}),
      ...(conversationUrl !== undefined ? { conversationUrl } : {}),
      ...(backend !== undefined ? { backend } : {}),
    };
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new LocalModelError("local model request timed out", null);
      }
      throw new LocalModelError("local model request failed", null);
    } finally {
      clearTimeout(timer);
    }
  }

  private async readModels(response: Response): Promise<readonly string[]> {
    const payload = (await response.json()) as { data?: Array<{ id?: unknown }> };
    return (payload.data ?? [])
      .map((entry) => entry.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }
}
