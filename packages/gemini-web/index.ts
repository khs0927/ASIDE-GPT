/**
 * Gemini Web oracle subcall contract.
 *
 * This module defines the types and pure-logic boundary for Aside's
 * "ask Gemini via the website" subcall pattern.  It intentionally contains
 * no Playwright code, no fetch calls, and no credential handling — those
 * belong to the Aside browser runtime that actually executes the page
 * interactions.
 *
 * Usage:
 *   1. The Aside orchestrator builds a `GeminiWebRequest`.
 *   2. The Aside browser runtime operates gemini.google.com and returns
 *      a `GeminiWebResult`.
 *   3. The orchestrator inspects the result and continues the original task.
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export type GeminiWebMode = "direct" | "oracle";

export interface GeminiWebRequest {
  /** The exact prompt text to submit to Gemini. */
  prompt: string;

  /**
   * "direct" — the user explicitly asked for a Gemini answer.
   * "oracle" — Aside is using Gemini as a bounded reasoning subcall.
   */
  mode: GeminiWebMode;

  /**
   * Optional model preference.  When omitted the currently-selected
   * suitable model is kept.  Only used when the user explicitly requests
   * a model.
   */
  model?: string | undefined;

  /**
   * Whether Aside may silently fall back to another model if the
   * requested model is unavailable.  Default: false.
   */
  allowModelFallback?: boolean | undefined;

  /**
   * Opaque tag the caller can attach so it can correlate the subcall
   * result with the task that triggered it.
   */
  correlationId?: string | undefined;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type GeminiWebStatus =
  | "completed"
  | "blocked"
  | "needs-signin"
  | "needs-confirmation"
  | "error";

export interface GeminiWebResult {
  /** Always "gemini-web". */
  provider: "gemini-web";
  /** Always "aside". */
  executor: "aside";
  status: GeminiWebStatus;

  /** Visible model label on the Gemini page, or "unknown". */
  model: string;
  /** Final conversation URL when available. */
  url?: string | undefined;
  /** Gemini's stable final response text. */
  response?: string | undefined;

  /** Visible source/citation links from the response. */
  sources?: readonly string[] | undefined;
  /** Usage-limit, cooldown, or UI notes. */
  notes?: readonly string[] | undefined;

  /** Correlates back to the triggering request. */
  correlationId?: string | undefined;
}

// ---------------------------------------------------------------------------
// Builder helpers — pure functions, no side effects
// ---------------------------------------------------------------------------

/** Create a minimal request for the basic smoke test. */
export function createSmokeTestRequest(): GeminiWebRequest {
  return {
    prompt: "Reply with only: ASIDE_GEMINI_OK",
    mode: "direct",
  };
}

/** Create an oracle subcall request. */
export function createOracleRequest(
  prompt: string,
  correlationId?: string,
): GeminiWebRequest {
  const req: GeminiWebRequest = {
    prompt,
    mode: "oracle",
  };
  if (correlationId !== undefined) req.correlationId = correlationId;
  return req;
}

/** Build a completed result. */
export function completedResult(
  model: string,
  response: string,
  url?: string,
  sources?: readonly string[],
  correlationId?: string,
): GeminiWebResult {
  const res: GeminiWebResult = {
    provider: "gemini-web",
    executor: "aside",
    status: "completed",
    model,
    response,
  };
  if (url !== undefined) res.url = url;
  if (sources !== undefined) res.sources = sources;
  if (correlationId !== undefined) res.correlationId = correlationId;
  return res;
}

/** Build a blocked result (quota/cooldown). */
export function blockedResult(
  model: string,
  reason: string,
  correlationId?: string,
): GeminiWebResult {
  const res: GeminiWebResult = {
    provider: "gemini-web",
    executor: "aside",
    status: "blocked",
    model,
    notes: [reason],
  };
  if (correlationId !== undefined) res.correlationId = correlationId;
  return res;
}

/** Build a needs-signin result. */
export function needsSigninResult(correlationId?: string): GeminiWebResult {
  const res: GeminiWebResult = {
    provider: "gemini-web",
    executor: "aside",
    status: "needs-signin",
    model: "unknown",
  };
  if (correlationId !== undefined) res.correlationId = correlationId;
  return res;
}

/** Build an error result. */
export function errorResult(
  reason: string,
  correlationId?: string,
): GeminiWebResult {
  const res: GeminiWebResult = {
    provider: "gemini-web",
    executor: "aside",
    status: "error",
    model: "unknown",
    notes: [reason],
  };
  if (correlationId !== undefined) res.correlationId = correlationId;
  return res;
}

// ---------------------------------------------------------------------------
// Validation — ensures the contract is not degraded into API/credential replay
// ---------------------------------------------------------------------------

/**
 * Validate that a request does not contain patterns that would turn this
 * into credential extraction or internal API replay.
 */
export function validateRequest(req: GeminiWebRequest): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (!req.prompt || req.prompt.trim().length === 0) {
    violations.push("prompt must not be empty");
  }

  // Guard: prompts must not ask Gemini to reveal credentials/tokens
  const credentialPatterns = [
    /__Secure-1PSID/i,
    /cookie.*extract/i,
    /oauth.*token.*export/i,
    /password.*show/i,
    /batchexecute/i,
    /StreamGenerate/i,
  ];
  for (const pattern of credentialPatterns) {
    if (pattern.test(req.prompt)) {
      violations.push(`prompt contains forbidden credential pattern: ${pattern.source}`);
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Validate that a result came from the Aside executor and has not been
 * tampered to look like an API response.
 */
export function validateResult(res: GeminiWebResult): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (res.provider !== "gemini-web") {
    violations.push(`provider must be "gemini-web", got "${res.provider}"`);
  }
  if (res.executor !== "aside") {
    violations.push(`executor must be "aside", got "${res.executor}"`);
  }
  if (res.status === "completed" && (!res.response || res.response.trim().length === 0)) {
    violations.push("completed result must include a non-empty response");
  }

  return { valid: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Prompt-injection guard for oracle mode
// ---------------------------------------------------------------------------

/** Patterns in Gemini output that oracle mode must never blindly execute. */
const INJECTION_PATTERNS = [
  /navigate to/i,
  /open (?:this )?(?:url|link|page)/i,
  /click (?:on )?(?:the )?(?:button|link)/i,
  /enter your (password|token|credential|cookie)/i,
  /run (?:this|the) (?:command|script)/i,
  /change (?:the|your) (?:setting|config)/i,
  /approve (?:the|this) (?:request|action)/i,
] as const;

/**
 * Scan a Gemini response for instruction-like patterns that oracle mode
 * must not blindly follow.  Returns the matched patterns as warnings.
 * The caller decides policy — this function does not block.
 */
export function scanOracleResponse(response: string): string[] {
  const warnings: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(response)) {
      warnings.push(`advisory output contains actionable instruction: ${pattern.source}`);
    }
  }
  return warnings;
}
