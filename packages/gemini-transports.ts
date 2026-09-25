export type GeminiTransportId =
  | "gemini-web-cdp"
  | "antigravity-cli"
  | "mcp-web-llm"
  | "aside-repl"
  | "hermes-gem-pw"
  | "gemini-web2api-go";

export interface GeminiTransportInfo {
  id: GeminiTransportId;
  role: "primary" | "official" | "specialized" | "experimental";
  status: "built-in" | "candidate" | "host-provided" | "experimental";
  requiresExistingBrowserSession: boolean;
  requiresExplicitOptIn: boolean;
  notes: string;
}

export const GEMINI_TRANSPORTS: Readonly<Record<GeminiTransportId, GeminiTransportInfo>> = {
  "gemini-web-cdp": {
    id: "gemini-web-cdp",
    role: "primary",
    status: "built-in",
    requiresExistingBrowserSession: true,
    requiresExplicitOptIn: false,
    notes: "Built-in bridge (packages/gemini-bridge): drives the visible Gemini page in a dedicated signed-in Chrome profile over loopback CDP.",
  },
  "antigravity-cli": {
    id: "antigravity-cli",
    role: "official",
    status: "built-in",
    requiresExistingBrowserSession: false,
    requiresExplicitOptIn: false,
    notes: "Official Antigravity CLI (agy) for AI Pro accounts; the bridge falls back to it automatically.",
  },
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
  "gemini-web-cdp",
  "antigravity-cli",
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
  const preferred = options.preferred ?? "gemini-web-cdp";
  const order = [preferred, ...DEFAULT_ORDER.filter((id) => id !== preferred)];

  for (const id of order) {
    const transport = GEMINI_TRANSPORTS[id];
    if (transport.status === "experimental" && options.allowExperimental !== true) continue;
    if (options.available?.[id] !== true) continue;
    return {
      transport,
      ready: true,
      fallbackUsed: id !== preferred || transport.role === "experimental" || transport.requiresExplicitOptIn,
    };
  }

  return {
    transport: GEMINI_TRANSPORTS[preferred],
    ready: false,
    fallbackUsed: false,
    blockedReason: "no-gemini-transport-available",
  };
}
