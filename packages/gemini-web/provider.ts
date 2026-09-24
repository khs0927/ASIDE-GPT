import { LocalModelClient, LocalModelError } from "../local-model.js";
import {
  validateRequest,
  type GeminiWebRequest,
  type GeminiWebStatus,
} from "./index.js";

export type GeminiWebProviderExecutor = "aside-gemini";
export type GeminiWebProviderTransport = "openai-compatible";

export interface GeminiWebProviderResult {
  provider: "gemini-web";
  executor: GeminiWebProviderExecutor;
  transport: GeminiWebProviderTransport;
  status: GeminiWebStatus;
  model: string;
  response?: string;
  conversationUrl?: string;
  notes?: readonly string[];
  correlationId?: string;
}

export interface GeminiWebProviderOptions {
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface GeminiWebProviderHealth {
  available: boolean;
  status: number | null;
  models: readonly string[];
  error?: string;
}

/**
 * Adapter for the aside-gemini OpenAI-compatible server.
 *
 * This is deliberately not labeled as an Aside executor. The server may be
 * backed by Gemini Web, agy, or a future backend; the response provenance
 * remains `aside-gemini` and the caller must preserve that identity.
 */
export class GeminiWebProvider {
  private readonly client: LocalModelClient;
  private readonly model: string;

  constructor(options: GeminiWebProviderOptions = {}) {
    const clientOptions: {
      baseUrl: string;
      fetchImpl?: typeof fetch;
      timeoutMs?: number;
    } = {
      baseUrl: options.baseUrl ?? "http://127.0.0.1:8765/v1",
    };
    if (options.fetchImpl !== undefined) clientOptions.fetchImpl = options.fetchImpl;
    if (options.timeoutMs !== undefined) clientOptions.timeoutMs = options.timeoutMs;
    this.client = new LocalModelClient(clientOptions);
    this.model = options.model ?? "auto";
  }

  async healthCheck(): Promise<GeminiWebProviderHealth> {
    return this.client.healthCheck();
  }

  async ask(request: GeminiWebRequest): Promise<GeminiWebProviderResult> {
    const validation = validateRequest(request);
    if (!validation.valid) {
      throw new LocalModelError(`invalid Gemini Web request: ${validation.violations.join("; ")}`, null);
    }

    try {
      const completion = await this.client.complete({
        model: request.model ?? this.model,
        messages: [{ role: "user", content: request.prompt }],
      });
      const result: GeminiWebProviderResult = {
        provider: "gemini-web",
        executor: "aside-gemini",
        transport: "openai-compatible",
        status: "completed",
        model: completion.model,
        response: completion.content,
        ...(completion.conversationUrl !== undefined
          ? { conversationUrl: completion.conversationUrl }
          : {}),
        ...(completion.backend !== undefined
          ? { notes: [`server backend: ${completion.backend}`] }
          : {}),
        ...(request.correlationId !== undefined
          ? { correlationId: request.correlationId }
          : {}),
      };
      return result;
    } catch (error) {
      if (error instanceof LocalModelError) {
        const status: GeminiWebStatus = error.status === 503 ? "blocked" : "error";
        return {
          provider: "gemini-web",
          executor: "aside-gemini",
          transport: "openai-compatible",
          status,
          model: request.model ?? this.model,
          notes: [error.message],
          ...(request.correlationId !== undefined
            ? { correlationId: request.correlationId }
            : {}),
        };
      }
      throw error;
    }
  }
}
