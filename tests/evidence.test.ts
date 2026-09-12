import assert from "node:assert/strict";
import { test } from "node:test";
import { createEvidence, validateEvidence } from "../packages/evidence/index.js";

test("accepts complete read evidence", () => {
  const evidence = createEvidence({
    finalUrl: "https://example.com/status",
    pageTitle: "Order status",
    importantValues: { status: "shipped" },
    timestamp: "2026-09-12T00:00:00.000Z",
    actions: ["Opened the order status page"],
    confirmationStatus: "not_required",
    sourceLinks: ["https://example.com/status"],
  });
  assert.equal(evidence.importantValues.status, "shipped");
  assert.equal(validateEvidence(evidence).valid, true);
});

test("rejects a success claim without evidence fields", () => {
  const validation = validateEvidence({ pageTitle: "Unknown" });
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.missing, [
    "finalUrl",
    "timestamp",
    "actions",
    "confirmationStatus",
    "importantValues",
  ]);
});
