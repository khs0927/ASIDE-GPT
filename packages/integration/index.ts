/**
 * Design-time composition review. This module does not launch browsers, contact
 * providers, authorize requests, or activate an adapter. Assertions are evidence
 * submitted for human review, NOT a security boundary or vendor certification.
 */
export const REMOTE_REQUIREMENTS = [
  "aside-hosted-browser",
  "mobile-only-onboarding",
  "official-task-submission",
  "account-authorization",
  "mobile-secure-sign-in",
  "task-status",
  "approval-and-continuation",
  "result-and-evidence",
  "phone-disconnected-execution",
  "supported-external-client",
] as const;
export type RemoteRequirement = (typeof REMOTE_REQUIREMENTS)[number];
export type Finding = {
  requirement: RemoteRequirement;
  status: "verified" | "advertised" | "unknown" | "unsupported";
  sourceUrl?: string;
  evidenceRef?: string;
};
export type Companion =
  | "aside-native-repl"
  | "playwright-fixture-tests"
  | "playwright-production-control"
  | "playwright-mcp-production"
  | "browser-use-agent";
export type CompositionInput = {
  companion: Companion;
  findings: readonly Finding[];
};
function isHttpsSource(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}
export function reviewComposition(input: CompositionInput) {
  const missing: RemoteRequirement[] = [];
  for (const requirement of REMOTE_REQUIREMENTS) {
    const records = input.findings.filter((item) => item.requirement === requirement);
    // Ambiguous duplicate assertions and advertising cannot unlock the review.
    const finding = records.length === 1 ? records[0] : undefined;
    if (
      !finding || finding.status !== "verified" ||
      !isHttpsSource(finding.sourceUrl) ||
      typeof finding.evidenceRef !== "string" || !finding.evidenceRef.trim()
    ) missing.push(requirement);
  }
  const allowed =
    input.companion === "aside-native-repl" ||
    input.companion === "playwright-fixture-tests";
  const reasons: string[] = [];
  if (!allowed) reasons.push("companion-would-replace-or-compete-with-aside");
  if (missing.length) reasons.push("official-remote-contract-incomplete");
  reasons.push("official-adapter-not-implemented");
  return {
    targetExecutor: "aside" as const,
    companion: input.companion,
    companionAllowed: allowed,
    verificationScope: input.companion === "playwright-fixture-tests"
      ? "isolated-owned-fixtures-only" as const : "no-external-browser-access" as const,
    missingRequirements: missing,
    readyForContractReview: allowed && missing.length === 0,
    // Never expose a configuration switch that pretends an official API exists.
    executionReady: false as const,
    asideExecutionCompleted: false as const,
    reasons,
  };
}
