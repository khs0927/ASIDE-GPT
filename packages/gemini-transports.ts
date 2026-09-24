export type GeminiTransportId =
  | "mcp-web-llm"
  | "aside-repl"
  | "hermes-gem-pw"
  | "gemini-web2api-go";

export interface GeminiTransportInfo {
  id: GeminiTransportId;
  role: "primary" | "specialized" | "experimental";
  status: "candidate" | "host-provided" | "experimental";
  requiresExistingBrowserSession: boolean;
  requiresExplicitOptIn: boolean;
  notes: string;
}

export const GEMINI_TRANSPORTS: Readonly<Record<GeminiTransportId, GeminiTransportInfo>> = {
  "mcp-web-llm": {
    id: "mcp-web-llm",
    role: "primary",
    status: "candidate",
    requiresExistingBrowserSession: true,
    requiresExplicitOptIn: false,
    notes: "MCP web-model router that can reuse a logged-in browser session.",
  },
  "aside-repl": {
    id: "aside-repl",
    role: "primary",
    status: "host-provided",
    requiresExistingBrowserSession: true,
    requiresExplicitOptIn: false,
    notes: "Official Aside deterministic browser REPL; use for smoke tests and transport fallback.",
  },
  "hermes-gem-pw": {
    id: "hermes-gem-pw",
    role: "specialized",
    status: "candidate",
    requiresExistingBrowserSession: true,
    requiresExplicitOptIn: false,
    notes: "Gemini-specific web automation for chat, sources, and Deep Research workflows.",
  },
  "gemini-web2api-go": {
    id: "gemini-web2api-go",
    role: "experimental",
    status: "experimental",
    requiresExistingBrowserSession: true,
    requiresExplicitOptIn: true,
    notes: "Web-protocol adapter; isolate behind an experimental flag and never make it the default.",
  },
};

const DEFAULT_ORDER: readonly GeminiTransportId[] = [
  "mcp-web-llm",
  "aside-repl",
  "hermes-gem-pw",
  "gemini-web2api-go",
];

export interface GeminiTransportSelectionOptions {
  available?: Partial<Record<GeminiTransportId, boolean>>;
  preferred?: GeminiTransportId;
  allowExperimental?: boolean;
}

export interface GeminiTransportSelection {
  transport: GeminiTransportInfo;
  ready: boolean;
  fallbackUsed: boolean;
  blockedReason?: "no-gemini-transport-available";
}

export function selectGeminiTransport(
  options: GeminiTransportSelectionOptions = {},
): GeminiTransportSelection {
  const preferred = options.preferred ?? "mcp-web-llm";
  const order = [preferred, ...DEFAULT_ORDER.filter((id) => id !== preferred)];

  for (const id of order) {
    const transport = GEMINI_TRANSPORTS[id];
    if (transport.status === "experimental" && options.allowExperimental !== true) continue;
    if (options.available?.[id] !== true) continue;
    return {
      transport,
      ready: true,
      fallbackUsed: id !== preferred || transport.role !== "primary" || transport.requiresExplicitOptIn,
    };
  }

  return {
    transport: GEMINI_TRANSPORTS[preferred],
    ready: false,
    fallbackUsed: false,
    blockedReason: "no-gemini-transport-available",
  };
}
