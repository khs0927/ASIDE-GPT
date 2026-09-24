export type JevState = string | Record<string, unknown> | readonly string[];

export type JevQuestion =
  | {
      type: "noul";
      instructions: string;
    }
  | {
      type: "choice";
      instructions: string;
      criteria: Record<string, string>;
    }
  | {
      type: "score";
      instructions: string;
      criteria: readonly string[];
    };

export type JevQuestions = Readonly<Record<string, JevQuestion>>;

export interface JevNoulAnswer {
  type: "noul";
  noul: number;
}

export interface JevChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Readonly<Record<string, number>>;
}

export interface JevScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  legend: Readonly<Record<string, string>>;
  probabilities: Readonly<Record<string, number>>;
}

export type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer;

export interface JevDecisionResponse {
  model: string;
  answers: Readonly<Record<string, JevAnswer>>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  cost?: string;
}

export interface JevDecisionProviderOptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class JevApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(message);
    this.name = "JevApiError";
  }
}

const DEFAULT_ENDPOINT = "https://opencode.ai/zen/v1/systemone";
const DEFAULT_MODEL = "jev-1.13-free";

function assertQuestions(questions: JevQuestions): void {
  const entries = Object.entries(questions);
  if (entries.length === 0) {
    throw new Error("Jev requires at least one question");
  }

  for (const [id, question] of entries) {
    if (!id || !question.instructions.trim()) {
      throw new Error("Every Jev question requires an ID and instructions");
    }
    if (question.type === "choice" && Object.keys(question.criteria).length < 2) {
      throw new Error(`Jev choice '${id}' requires at least two options`);
    }
    if (question.type === "score" && question.criteria.length < 2) {
      throw new Error(`Jev score '${id}' requires at least two ordered levels`);
    }
  }
}

/**
 * Typed client for TypeSafe System One decision models.
 *
 * Jev does not generate chat prose or tool calls. Use it for bounded
 * choice/noul/score decisions and let the orchestrator or another model
 * explain, retrieve, calculate, and perform external actions.
 */
export class JevDecisionProvider {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: JevDecisionProviderOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.model = options.model ?? DEFAULT_MODEL;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async decide(
    state: JevState,
    questions: JevQuestions,
  ): Promise<JevDecisionResponse> {
    assertQuestions(questions);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: this.model, state, questions }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const responseBody = await response.text();

    if (!response.ok) {
      throw new JevApiError(
        `Jev request failed with HTTP ${response.status}`,
        response.status,
        responseBody.slice(0, 2_000),
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseBody);
    } catch {
      throw new Error("Jev returned a non-JSON response");
    }

    if (!isJevDecisionResponse(parsed)) {
      throw new Error("Jev returned an invalid decision response");
    }
    return parsed;
  }
}

function isJevDecisionResponse(value: unknown): value is JevDecisionResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { model?: unknown; answers?: unknown };
  return (
    typeof candidate.model === "string" &&
    typeof candidate.answers === "object" &&
    candidate.answers !== null
  );
}
