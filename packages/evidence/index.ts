import type { Evidence, EvidenceValidation } from "../schemas/index.js";

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export function validateEvidence(evidence: Partial<Evidence>): EvidenceValidation {
  const missing: string[] = [];
  if (!evidence.finalUrl || !URL_PATTERN.test(evidence.finalUrl)) missing.push("finalUrl");
  if (!evidence.pageTitle?.trim()) missing.push("pageTitle");
  if (!evidence.timestamp?.trim()) missing.push("timestamp");
  if (!evidence.actions || evidence.actions.length === 0) missing.push("actions");
  if (!evidence.confirmationStatus) missing.push("confirmationStatus");
  if (!evidence.importantValues) missing.push("importantValues");
  return { valid: missing.length === 0, missing };
}

export function createEvidence(input: Evidence): Evidence {
  const validation = validateEvidence(input);
  if (!validation.valid) {
    throw new Error(`Evidence is incomplete: ${validation.missing.join(", ")}`);
  }
  const evidence: Evidence = {
    ...input,
    finalUrl: input.finalUrl.trim(),
    pageTitle: input.pageTitle.trim(),
    timestamp: input.timestamp.trim(),
    actions: [...input.actions],
  };
  if (input.sourceLinks) evidence.sourceLinks = [...input.sourceLinks];
  if (input.screenshots) evidence.screenshots = [...input.screenshots];
  return evidence;
}
