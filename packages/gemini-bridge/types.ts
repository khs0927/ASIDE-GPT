/**
 * Shared contract for the local Gemini bridge.
 *
 * A backend turns one prompt into one Gemini answer. Two backends exist:
 *   - "gemini-web": drives gemini.google.com in a signed-in Chrome over CDP.
 *   - "agy":        calls the official Antigravity CLI.
 *
 * Neither backend reads cookies, tokens, or private Gemini RPC endpoints.
 */

export type GeminiBackendId = "gemini-web" | "agy";

export type GeminiAskStatus = "completed" | "blocked" | "needs-signin" | "error";

export interface GeminiAskRequest {
  prompt: string;
  /** Visible mode/model label to select, e.g. "Pro", "Thinking", "Fast". */
  mode?: string | undefined;
  /** Start a new chat. Defaults to true unless conversationUrl is given. */
  newChat?: boolean | undefined;
  /** Continue an existing https://gemini.google.com/app/... conversation. */
  conversationUrl?: string | undefined;
  /** Local file paths to attach (gemini-web only). */
  files?: readonly string[] | undefined;
  /** Gem id or https://gemini.google.com/gem/... URL (gemini-web only). */
  gem?: string | undefined;
  timeoutMs?: number | undefined;
  /** Receives the full response text seen so far while Gemini is generating. */
  onProgress?: ((textSoFar: string) => void) | undefined;
}

export interface GeminiAskResult {
  backend: GeminiBackendId;
  status: GeminiAskStatus;
  text?: string | undefined;
  /** Visible model/mode label, when the backend can observe it. */
  model?: string | undefined;
  /** Conversation URL, so a caller can continue the same chat. */
  url?: string | undefined;
  sources?: readonly string[] | undefined;
  notes: string[];
  elapsedMs: number;
}

export interface GeminiBackendStatus {
  backend: GeminiBackendId;
  available: boolean;
  detail: string;
}

export interface GeminiBackend {
  readonly id: GeminiBackendId;
  status(): Promise<GeminiBackendStatus>;
  ask(request: GeminiAskRequest): Promise<GeminiAskResult>;
  close?(): Promise<void>;
}

export function failure(
  backend: GeminiBackendId,
  status: Exclude<GeminiAskStatus, "completed">,
  note: string,
  startedAt: number,
  extra: Partial<GeminiAskResult> = {},
): GeminiAskResult {
  return { backend, status, notes: [note], elapsedMs: Date.now() - startedAt, ...extra };
}
