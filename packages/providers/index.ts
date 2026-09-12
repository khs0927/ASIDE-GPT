export type BrowserProviderId =
  | "aside-official-remote"
  | "work-native"
  | "future-provider";

export type ProviderStatus =
  | "commercial-capability-confirmed"
  | "available-by-host"
  | "not-implemented";

export interface BrowserProviderInfo {
  id: BrowserProviderId;
  role: "primary" | "fallback" | "optional-future";
  execution: "external-hosted-runtime" | "host-product";
  callableFromAsideGpt: boolean;
  status: ProviderStatus;
  publicIntegrationContract: "published" | "not-published" | "not-applicable";
  notes: string;
}

export const BROWSER_PROVIDERS: Readonly<Record<BrowserProviderId, BrowserProviderInfo>> = {
  "aside-official-remote": {
    id: "aside-official-remote",
    role: "primary",
    execution: "external-hosted-runtime",
    callableFromAsideGpt: false,
    status: "commercial-capability-confirmed",
    publicIntegrationContract: "not-published",
    notes:
      "Aside's official pricing advertises Channels (Remote control), Cloud handoff, and team/API-triggered browser-agent runs from apps, cron jobs, or internal tools. The public Help Center does not currently publish the remote endpoint/auth/schema needed to call those capabilities from ASIDE-GPT, so this provider must not invent an endpoint or silently substitute another browser.",
  },
  "work-native": {
    id: "work-native",
    role: "fallback",
    execution: "host-product",
    callableFromAsideGpt: false,
    status: "available-by-host",
    publicIntegrationContract: "not-applicable",
    notes:
      "ChatGPT Work can operate its own cloud browser, but that is not Aside. Use it only when the user explicitly allows a non-Aside fallback.",
  },
  "future-provider": {
    id: "future-provider",
    role: "optional-future",
    execution: "external-hosted-runtime",
    callableFromAsideGpt: false,
    status: "not-implemented",
    publicIntegrationContract: "not-published",
    notes: "Reserved for another documented provider if the user explicitly chooses one.",
  },
};

export function selectBrowserProvider(
  preferred: BrowserProviderId = "aside-official-remote",
): BrowserProviderInfo {
  return BROWSER_PROVIDERS[preferred];
}
