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

export interface JevBrowserSourceContext {
  tabId?: string;
  url?: string;
  pageTitle?: string;
}

export interface JevDecisionCheckpointInput {
  purpose: string;
  source?: JevBrowserSourceContext;
  response: JevDecisionResponse;
  nextAsideAction: string;
  observedAt?: string;
}

export interface JevDecisionCheckpoint {
  kind: "jev-decision-checkpoint";
  purpose: string;
  source?: JevBrowserSourceContext;
  model: string;
  answers: Readonly<Record<string, JevAnswer>>;
  nextAsideAction: string;
  observedAt: string;
  requiresFreshSnapshot: true;
  browserActionAuthorized: false;
}

export const JEV_ZEN_ENDPOINT = "https://opencode.ai/zen/v1/systemone";
export const JEV_ZEN_FREE_MODEL = "jev-1.13-free";
export const JEV_TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const JEV_TYPESAFE_MODEL = "jev-1.13.0";

export class JevApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: string,
    readonly endpoint: string,
    readonly model: string,
  ) {
    super(message);
    this.name = "JevApiError";
  }
}

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
  // Mutable so a successful free-to-direct fallback can pin the provider to the
  // endpoint that actually answered, instead of retrying the dead one every call.
  private endpoint: string;
  private model: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: JevDecisionProviderOptions = {}) {
    this.endpoint = options.endpoint ?? JEV_ZEN_ENDPOINT;
    this.model = options.model ?? JEV_ZEN_FREE_MODEL;
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

    const post = async (
      endpoint: string,
      model: string,
      requestHeaders: Record<string, string>,
    ): Promise<{ ok: boolean; status: number; body: string }> => {
      const res = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ model, state, questions }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return { ok: res.ok, status: res.status, body: await res.text() };
    };

    // Primary path: the anonymous Zen Free endpoint, which is free-first by default.
    let attempt = await post(this.endpoint, this.model, headers);

    // Fallback: if the free endpoint stops serving anonymous traffic, retry once
    // against the authenticated TypeSafe endpoint, but only when a key is available.
    // Never switch endpoints when the caller pinned a specific endpoint/model.
    if (
      !attempt.ok &&
      this.apiKey &&
      this.endpoint === JEV_ZEN_ENDPOINT &&
      this.model === JEV_ZEN_FREE_MODEL &&
      (attempt.status === 401 || attempt.status === 403 || attempt.status === 404 || attempt.status === 422)
    ) {
      const fallbackHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${this.apiKey}`,
      };
      attempt = await post(JEV_TYPESAFE_ENDPOINT, JEV_TYPESAFE_MODEL, fallbackHeaders);
      if (attempt.ok) {
        this.endpoint = JEV_TYPESAFE_ENDPOINT;
        this.model = JEV_TYPESAFE_MODEL;
      }
    }

    const responseBody = attempt.body;

    if (!attempt.ok) {
      throw new JevApiError(
        `Jev request failed with HTTP ${attempt.status} for model ${this.model}`,
        attempt.status,
        responseBody.slice(0, 2_000),
        this.endpoint,
        this.model,
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

export function createJevDecisionCheckpoint(
  input: JevDecisionCheckpointInput,
): JevDecisionCheckpoint {
  if (!input.purpose.trim()) {
    throw new Error("Jev checkpoint requires a purpose");
  }
  if (!input.nextAsideAction.trim()) {
    throw new Error("Jev checkpoint requires the next official Aside action");
  }

  const checkpoint: JevDecisionCheckpoint = {
    kind: "jev-decision-checkpoint",
    purpose: input.purpose,
    model: input.response.model,
    answers: input.response.answers,
    nextAsideAction: input.nextAsideAction,
    observedAt: input.observedAt ?? new Date().toISOString(),
    requiresFreshSnapshot: true,
    browserActionAuthorized: false,
  };
  if (input.source) {
    checkpoint.source = input.source;
  }
  return checkpoint;
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
