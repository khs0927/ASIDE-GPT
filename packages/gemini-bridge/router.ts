import {
  failure,
  type GeminiAskRequest,
  type GeminiAskResult,
  type GeminiBackend,
  type GeminiBackendId,
  type GeminiBackendStatus,
} from "./types.js";

export interface RoutedResult extends GeminiAskResult {
  /** Every backend tried, in order, with its outcome. */
  attempts: Array<{ backend: GeminiBackendId; status: GeminiAskResult["status"]; note?: string }>;
}

/**
 * Provider separation is strict. Without an explicit `only`, only the first
 * configured backend is used; failures never silently fall through to another
 * provider. Once a backend has streamed partial text the router stops there.
 */
export class GeminiRouter {
  constructor(readonly backends: readonly GeminiBackend[]) {
    if (backends.length === 0) throw new Error("GeminiRouter needs at least one backend");
  }

  /** Pass `only` to pin one backend (e.g. model "agy") with no fallthrough. */
  async ask(request: GeminiAskRequest, only?: GeminiBackendId): Promise<RoutedResult> {
    const candidates = only ? this.backends.filter((backend) => backend.id === only) : this.backends.slice(0, 1);
    if (candidates.length === 0) {
      return { ...failure(only as GeminiBackendId, "error", `backend ${only} is not enabled`, Date.now()), attempts: [] };
    }
    const attempts: RoutedResult["attempts"] = [];
    let last: GeminiAskResult | undefined;
    for (const backend of candidates) {
      let streamed = false;
      const result = await backend.ask({
        ...request,
        onProgress: request.onProgress
          ? (text) => {
              streamed = true;
              request.onProgress?.(text);
            }
          : undefined,
      });
      attempts.push({ backend: backend.id, status: result.status, ...(result.notes[0] ? { note: result.notes[0] } : {}) });
      last = result;
      if (result.status === "completed" || streamed) break;
    }
    return { ...(last as GeminiAskResult), attempts };
  }

  status(): Promise<GeminiBackendStatus[]> {
    return Promise.all(this.backends.map((backend) => backend.status()));
  }

  async close(): Promise<void> {
    await Promise.all(this.backends.map((backend) => backend.close?.()));
  }
}
