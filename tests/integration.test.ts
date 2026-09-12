import assert from "node:assert/strict";
import { test } from "node:test";
import { REMOTE_REQUIREMENTS, reviewComposition, type Finding } from "../packages/integration/index.js";

const complete = (): Finding[] => REMOTE_REQUIREMENTS.map((requirement) => ({
  requirement, status: "verified", sourceUrl: "https://example.com/test-fixture",
  evidenceRef: "test-only:vendor-contract-review",
}));
test("defaults to blocking: fixture tests do not supply hosted Aside", () => {
  const result = reviewComposition({ companion: "playwright-fixture-tests", findings: [] });
  assert.equal(result.companionAllowed, true);
  assert.equal(result.executionReady, false);
  assert.equal(result.verificationScope, "isolated-owned-fixtures-only");
  assert.deepEqual(result.missingRequirements, [...REMOTE_REQUIREMENTS]);
});
test("Cloud handoff advertising does not prove hosted execution", () => {
  const findings = complete();
  findings[0] = { requirement: "aside-hosted-browser", status: "advertised",
    sourceUrl: "https://aside.com/pricing", evidenceRef: "marketing-copy" };
  assert.equal(reviewComposition({ companion: "aside-native-repl", findings }).readyForContractReview, false);
});
test("even complete review evidence never activates a nonexistent adapter", () => {
  const result = reviewComposition({ companion: "aside-native-repl", findings: complete() });
  assert.equal(result.readyForContractReview, true);
  assert.equal(result.executionReady, false);
  assert.equal(result.asideExecutionCompleted, false);
});
for (const companion of ["playwright-production-control", "playwright-mcp-production", "browser-use-agent"] as const) {
  test(companion + " cannot silently replace Aside or share its writer session", () => {
    const result = reviewComposition({ companion, findings: complete() });
    assert.equal(result.companionAllowed, false);
    assert.equal(result.readyForContractReview, false);
    assert.equal(result.executionReady, false);
  });
}
for (const requirement of REMOTE_REQUIREMENTS) {
  test("requires evidence for " + requirement, () => {
    const findings = complete().filter((f) => f.requirement !== requirement);
    assert.deepEqual(reviewComposition({ companion: "aside-native-repl", findings }).missingRequirements, [requirement]);
  });
}
test("duplicates and conflicting assertions fail closed", () => {
  const findings = [...complete(), { requirement: "aside-hosted-browser", status: "unsupported" } as Finding];
  assert.equal(reviewComposition({ companion: "aside-native-repl", findings }).readyForContractReview, false);
});
test("a source without traceable evidence does not count", () => {
  const findings = complete().map(({ evidenceRef: _ignored, ...rest }) => rest);
  assert.equal(reviewComposition({ companion: "aside-native-repl", findings }).readyForContractReview, false);
});
for (const sourceUrl of ["", "not a URL", "http://example.com", "file:///tmp/evidence", "https://user:secret@example.com"]) {
  test("rejects invalid source reference " + sourceUrl, () => {
    const findings = complete().map((f) => ({ ...f, sourceUrl }));
    assert.equal(reviewComposition({ companion: "aside-native-repl", findings }).readyForContractReview, false);
  });
}
