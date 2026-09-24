import assert from "node:assert/strict";
import { test } from "node:test";
import {
  JevApiError,
  JevDecisionProvider,
  type JevDecisionResponse,
} from "../packages/decisions/index.js";

const responseBody: JevDecisionResponse = {
  model: "jev-1.13-free",
  answers: {
    is_urgent: { type: "noul", noul: 0.98 },
    department: {
      type: "choice",
      choice: "billing",
      confidence: 0.99,
      probabilities: { billing: 0.99, technical: 0.01, other: 0 },
    },
  },
  usage: { input_tokens: 400, output_tokens: 57 },
  cost: "0",
};

test("Jev provider sends a System One request without exposing credentials", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const provider = new JevDecisionProvider({
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const result = await provider.decide("결제가 3일째 실패했습니다", {
    is_urgent: {
      type: "noul",
      instructions: "긴급함 또는 시간 민감성을 나타내는가?",
    },
  });

  assert.equal(capturedUrl, "https://opencode.ai/zen/v1/systemone");
  assert.equal(capturedInit?.method, "POST");
  const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
  assert.equal(body.model, "jev-1.13-free");
  assert.equal(body.state, "결제가 3일째 실패했습니다");
  assert.equal(
    (capturedInit?.headers as Record<string, string>).Authorization,
    undefined,
  );
  assert.equal(result.answers.is_urgent?.type, "noul");
  assert.equal(result.answers.department?.type, "choice");
});

test("Jev provider supports authenticated access without logging the key", async () => {
  let authorization: string | undefined;
  const provider = new JevDecisionProvider({
    apiKey: "test-secret",
    fetchImpl: async (_input, init) => {
      authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
      return new Response(JSON.stringify(responseBody), { status: 200 });
    },
  });

  await provider.decide("test", { urgent: { type: "noul", instructions: "Urgent?" } });
  assert.equal(authorization, "Bearer test-secret");
});

test("Jev provider rejects incomplete typed questions before network access", async () => {
  let called = false;
  const provider = new JevDecisionProvider({
    fetchImpl: async () => {
      called = true;
      return new Response("{}", { status: 200 });
    },
  });

  await assert.rejects(
    () => provider.decide("state", { empty: { type: "choice", instructions: "Pick", criteria: { only: "Only option" } } }),
    /at least two options/,
  );
  assert.equal(called, false);
});

test("Jev provider surfaces HTTP errors with a bounded response body", async () => {
  const provider = new JevDecisionProvider({
    fetchImpl: async () => new Response("temporarily unavailable", { status: 503 }),
  });

  await assert.rejects(
    () => provider.decide("state", { urgent: { type: "noul", instructions: "Urgent?" } }),
    (error: unknown) => {
      assert.ok(error instanceof JevApiError);
      assert.equal(error.status, 503);
      assert.equal(error.responseBody, "temporarily unavailable");
      return true;
    },
  );
});
