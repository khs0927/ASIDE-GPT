export type BrowserProviderId = "work-native" | "aside-cloud" | "future-provider";

export interface BrowserProviderInfo {
  id: BrowserProviderId;
  role: "native" | "optional-future";
  execution: "host-product" | "external-hosted-runtime";
  callableFromAsideGpt: boolean;
  status: "available-by-host" | "unverified" | "not-implemented";
  notes: string;
}

export const BROWSER_PROVIDERS: Readonly<Record<BrowserProviderId, BrowserProviderInfo>> = {
  "work-native": {
    id: "work-native",
    role: "native",
    execution: "host-product",
    callableFromAsideGpt: false,
    status: "available-by-host",
    notes:
      "ChatGPT Work chooses and operates its cloud browser. ASIDE-GPT supplies skills and policies; it does not call a private browser API.",
  },
  "aside-cloud": {
    id: "aside-cloud",
    role: "optional-future",
    execution: "external-hosted-runtime",
    callableFromAsideGpt: false,
    status: "unverified",
    notes:
      "No public Aside hosted-browser execution API was verified, so no endpoint, credential, or client is implemented.",
  },
  "future-provider": {
    id: "future-provider",
    role: "optional-future",
    execution: "external-hosted-runtime",
    callableFromAsideGpt: false,
    status: "not-implemented",
    notes: "Reserved for a documented provider with a supported cloud runtime and authorization model.",
  },
};

export function selectBrowserProvider(
  preferred?: BrowserProviderId,
): BrowserProviderInfo & { id: "work-native" } {
  if (preferred && preferred !== "work-native") {
    return BROWSER_PROVIDERS["work-native"] as BrowserProviderInfo & { id: "work-native" };
  }
  return BROWSER_PROVIDERS["work-native"] as BrowserProviderInfo & { id: "work-native" };
}
