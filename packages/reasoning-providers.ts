export type ReasoningProviderId =
  | "ollama"
  | "lm-studio"
  | "chatgpt-subscription"
  | "claude-subscription"
  | "gemini-web-oracle";

export interface ReasoningProviderInfo {
  id: ReasoningProviderId;
  kind: "local-model" | "subscription" | "web-oracle";
  role: "primary" | "fallback" | "advisory";
  requiresApiKey: boolean;
  notes: string;
}

export const REASONING_PROVIDERS: Readonly<Record<ReasoningProviderId, ReasoningProviderInfo>> = {
  ollama: {
    id: "ollama",
    kind: "local-model",
    role: "primary",
    requiresApiKey: false,
    notes: "Local model path for low-cost browser planning and fallback reasoning.",
  },
  "lm-studio": {
    id: "lm-studio",
    kind: "local-model",
    role: "fallback",
    requiresApiKey: false,
    notes: "Local OpenAI-compatible model endpoint for private reasoning.",
  },
  "chatgpt-subscription": {
    id: "chatgpt-subscription",
    kind: "subscription",
    role: "primary",
    requiresApiKey: false,
    notes: "Existing ChatGPT subscription path when the host supports it.",
  },
  "claude-subscription": {
    id: "claude-subscription",
    kind: "subscription",
    role: "fallback",
    requiresApiKey: false,
    notes: "Existing Claude subscription path when the host supports it.",
  },
  "gemini-web-oracle": {
    id: "gemini-web-oracle",
    kind: "web-oracle",
    role: "advisory",
    requiresApiKey: false,
    notes: "Gemini website subcall for bounded reasoning, not a replacement for the main planner.",
  },
};

const DEFAULT_ORDER: readonly ReasoningProviderId[] = [
  "ollama",
  "lm-studio",
  "chatgpt-subscription",
  "claude-subscription",
  "gemini-web-oracle",
];

export interface ReasoningProviderSelectionOptions {
  available?: Partial<Record<ReasoningProviderId, boolean>>;
  preferred?: ReasoningProviderId;
  allowWebOracle?: boolean;
}

export interface ReasoningProviderSelection {
  provider: ReasoningProviderInfo;
  ready: boolean;
  fallbackUsed: boolean;
  blockedReason?: "no-reasoning-provider-available";
}

export function selectReasoningProvider(
  options: ReasoningProviderSelectionOptions = {},
): ReasoningProviderSelection {
  const preferred = options.preferred ?? "ollama";
  const order = [preferred, ...DEFAULT_ORDER.filter((id) => id !== preferred)];

  for (const id of order) {
    const provider = REASONING_PROVIDERS[id];
    if (provider.kind === "web-oracle" && options.allowWebOracle !== true) continue;
    if (options.available?.[id] !== true) continue;
    return { provider, ready: true, fallbackUsed: id !== preferred || provider.role !== "primary" };
  }

  return {
    provider: REASONING_PROVIDERS[preferred],
    ready: false,
    fallbackUsed: false,
    blockedReason: "no-reasoning-provider-available",
  };
}
