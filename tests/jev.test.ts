import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createJevDecisionCheckpoint,
  JEV_TYPESAFE_ENDPOINT,
  JEV_TYPESAFE_MODEL,
  JEV_ZEN_ENDPOINT,
  JEV_ZEN_FREE_MODEL,
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

  assert.equal(capturedUrl, JEV_ZEN_ENDPOINT);
  assert.equal(capturedInit?.method, "POST");
  const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
  assert.equal(body.model, JEV_ZEN_FREE_MODEL);
  assert.equal(JEV_ZEN_FREE_MODEL, "jev-1.13-free");
  assert.equal(JEV_TYPESAFE_MODEL, "jev-1.13.0");
  assert.equal(JEV_TYPESAFE_ENDPOINT, "https://api.typesafe.ai/v1/systemone");
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

test("Jev checkpoint preserves browser context but never authorizes the action", () => {
  const checkpoint = createJevDecisionCheckpoint({
    purpose: "철골 완료 공종 판정",
    source: {
      tabId: "tab-seumter",
      url: "https://www.eais.go.kr/websquare/websquare.html",
      pageTitle: "건축허가·착공·사용승인",
    },
    response: responseBody,
    nextAsideAction: "현재 세움터 탭을 다시 연결하고 새 스냅샷을 확인한 뒤 공식 Aside 절차로 재개",
    observedAt: "2026-09-24T07:20:00.000Z",
  });

  assert.equal(checkpoint.kind, "jev-decision-checkpoint");
  assert.equal(checkpoint.model, "jev-1.13-free");
  assert.equal(checkpoint.source?.tabId, "tab-seumter");
  assert.equal(checkpoint.requiresFreshSnapshot, true);
  assert.equal(checkpoint.browserActionAuthorized, false);
  assert.equal(checkpoint.answers.department?.type, "choice");
});

test("Jev provider surfaces model and endpoint on authentication failures", async () => {
  const provider = new JevDecisionProvider({
    fetchImpl: async () => new Response("unauthorized", { status: 401 }),
  });

  await assert.rejects(
    () => provider.decide("state", { urgent: { type: "noul", instructions: "Urgent?" } }),
    (error: unknown) => {
      assert.ok(error instanceof JevApiError);
      assert.equal(error.status, 401);
      assert.equal(error.endpoint, JEV_ZEN_ENDPOINT);
      assert.equal(error.model, JEV_ZEN_FREE_MODEL);
      assert.match(error.message, /jev-1\.13-free/);
      return true;
    },
  );
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
