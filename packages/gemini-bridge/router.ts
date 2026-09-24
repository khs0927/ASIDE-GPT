import type {
  GeminiAskRequest,
  GeminiAskResult,
  GeminiBackend,
  GeminiBackendId,
  GeminiBackendStatus,
} from "./types.js";

export interface RoutedResult extends GeminiAskResult {
  /** Every backend tried, in order, with its outcome. */
  attempts: Array<{ backend: GeminiBackendId; status: GeminiAskResult["status"]; note?: string }>;
}

/**
 * Tries backends in order and falls through on any non-completed result.
 * Once a backend has streamed partial text the router stops there, so a caller
 * never receives two different answers spliced together.
 */
export class GeminiRouter {
  constructor(readonly backends: readonly GeminiBackend[]) {
    if (backends.length === 0) throw new Error("GeminiRouter needs at least one backend");
  }

  async ask(request: GeminiAskRequest): Promise<RoutedResult> {
    const attempts: RoutedResult["attempts"] = [];
    let last: GeminiAskResult | undefined;
    for (const backend of this.backends) {
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
