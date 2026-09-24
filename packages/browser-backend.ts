export type BrowserBackendId =
  | "aside-repl"
  | "aside-agent"
  | "browser-control"
  | "playwright-mcp"
  | "aside-remote";

export type BrowserBackendExecutor = "aside" | "external-browser";

export interface BrowserBackendInfo {
  id: BrowserBackendId;
  role: "primary" | "fallback" | "future";
  executor: BrowserBackendExecutor;
  status: "available-by-host" | "external-opt-in" | "official-access-required";
  requiresExplicitOptIn: boolean;
  notes: string;
}

export const BROWSER_BACKENDS: Readonly<Record<BrowserBackendId, BrowserBackendInfo>> = {
  "aside-repl": {
    id: "aside-repl",
    role: "primary",
    executor: "aside",
    status: "available-by-host",
    requiresExplicitOptIn: false,
    notes: "Official Aside REPL for deterministic page inspection and browser actions.",
  },
  "aside-agent": {
    id: "aside-agent",
    role: "fallback",
    executor: "aside",
    status: "available-by-host",
    requiresExplicitOptIn: false,
    notes: "Official Aside browser agent when model inference is required.",
  },
  "browser-control": {
    id: "browser-control",
    role: "fallback",
    executor: "external-browser",
    status: "external-opt-in",
    requiresExplicitOptIn: true,
    notes: "Local extension-backed browser control fallback; never reported as Aside execution.",
  },
  "playwright-mcp": {
    id: "playwright-mcp",
    role: "fallback",
    executor: "external-browser",
    status: "external-opt-in",
    requiresExplicitOptIn: true,
    notes: "Local Playwright MCP fallback; never reported as Aside execution.",
  },
  "aside-remote": {
    id: "aside-remote",
    role: "future",
    executor: "aside",
    status: "official-access-required",
    requiresExplicitOptIn: false,
    notes: "Future official remote control plane; do not invent an endpoint or credentials.",
  },
};

const DEFAULT_ORDER: readonly BrowserBackendId[] = [
  "aside-repl",
  "aside-agent",
  "browser-control",
  "playwright-mcp",
  "aside-remote",
];

export interface BrowserBackendSelectionOptions {
  available?: Partial<Record<BrowserBackendId, boolean>>;
  preferred?: BrowserBackendId;
  allowExternalFallback?: boolean;
  asideRemoteAvailable?: boolean;
}

export interface BrowserBackendSelection {
  backend: BrowserBackendInfo;
  ready: boolean;
  fallbackUsed: boolean;
  blockedReason?: "no-browser-backend-available" | "official-aside-access-required";
}

export function selectBrowserBackend(
  options: BrowserBackendSelectionOptions = {},
): BrowserBackendSelection {
  const available = options.available ?? {};
  const preferred = options.preferred ?? "aside-repl";
  const order = [preferred, ...DEFAULT_ORDER.filter((id) => id !== preferred)];

  for (const id of order) {
    const backend = BROWSER_BACKENDS[id];
    const remoteAvailable = id === "aside-remote" && options.asideRemoteAvailable === true;
    const isAvailable = id === "aside-remote" ? remoteAvailable : available[id] === true;
    if (!isAvailable) continue;
    if (backend.requiresExplicitOptIn && options.allowExternalFallback !== true) continue;
    return {
      backend,
      ready: true,
      fallbackUsed: id !== preferred || backend.requiresExplicitOptIn,
    };
  }

  if (available["aside-remote"] === true && options.asideRemoteAvailable !== true) {
    return {
      backend: BROWSER_BACKENDS["aside-remote"],
      ready: false,
      fallbackUsed: false,
      blockedReason: "official-aside-access-required",
    };
  }

  const primary = BROWSER_BACKENDS["aside-repl"];
  return {
    backend: primary,
    ready: false,
    fallbackUsed: false,
    blockedReason: "no-browser-backend-available",
  };
}

export function isAsideBackend(backend: BrowserBackendInfo): boolean {
  return backend.executor === "aside";
}
