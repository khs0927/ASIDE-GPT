export type BrowserProviderId = "aside-remote" | "work-native" | "future-provider";

export type BrowserProviderStatus =
  | "channel-transport-available"
  | "available-by-host"
  | "not-implemented";

export interface BrowserProviderInfo {
  id: BrowserProviderId;
  role: "primary" | "fallback" | "optional-future";
  execution: "aside-official-remote" | "host-product" | "external-hosted-runtime";
  performsAsideExecution: boolean;
  callableFromAsideGpt: boolean;
  status: BrowserProviderStatus;
  notes: string;
}

export const BROWSER_PROVIDERS: Readonly<Record<BrowserProviderId, BrowserProviderInfo>> = {
  "aside-remote": {
    id: "aside-remote",
    role: "primary",
    execution: "aside-official-remote",
    performsAsideExecution: true,
    callableFromAsideGpt: true,
    status: "channel-transport-available",
    notes:
      "Aside officially supports Channels remote control over Slack and Telegram. ChatGPT can send/read Slack through its connected Slack plugin, so Channels provides a supported transport without inventing a private Aside API. Per-user readiness still requires a verified Aside-connected Slack conversation and a live no-PC Cloud handoff smoke test.",
  },
  "work-native": {
    id: "work-native",
    role: "fallback",
    execution: "host-product",
    performsAsideExecution: false,
    callableFromAsideGpt: false,
    status: "available-by-host",
    notes:
      "ChatGPT Work may operate its native cloud browser as an explicit non-Aside fallback. This does not count as ASIDE-GPT success because Aside is not the browser executor.",
  },
  "future-provider": {
    id: "future-provider",
    role: "optional-future",
    execution: "external-hosted-runtime",
    performsAsideExecution: false,
    callableFromAsideGpt: false,
    status: "not-implemented",
    notes: "Reserved for a documented provider with a supported cloud runtime and authorization model.",
  },
};

export interface ProviderSelectionOptions {
  allowNonAsideFallback?: boolean | undefined;
  preferred?: BrowserProviderId | undefined;
}

export interface ProviderSelection {
  provider: BrowserProviderInfo;
  ready: boolean;
  fallbackUsed: boolean;
}

export function selectBrowserProvider(options: ProviderSelectionOptions = {}): ProviderSelection {
  const preferred = options.preferred ?? "aside-remote";

  if (preferred === "work-native" && options.allowNonAsideFallback) {
    return {
      provider: BROWSER_PROVIDERS["work-native"],
      ready: true,
      fallbackUsed: true,
    };
  }

  const aside = BROWSER_PROVIDERS["aside-remote"];
  return {
    provider: aside,
    ready: aside.callableFromAsideGpt,
    fallbackUsed: false,
  };
}

export function isAsideExecution(provider: BrowserProviderInfo): boolean {
  return provider.performsAsideExecution;
}
