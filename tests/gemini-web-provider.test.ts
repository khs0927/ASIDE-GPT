import assert from "node:assert/strict";
import { test } from "node:test";
import { GeminiWebProvider } from "../packages/gemini-web/provider.js";

test("Gemini Web provider preserves aside-gemini provenance", async () => {
  const calls: string[] = [];
  const provider = new GeminiWebProvider({
    baseUrl: "http://127.0.0.1:8765/v1",
    model: "gemini-web:Pro",
    fetchImpl: async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: "gemini-web" }] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          model: "gemini-web",
          choices: [{ message: { content: "GEMINI_PROVIDER_OK" } }],
        }),
        {
          status: 200,
          headers: {
            "X-Backend": "gemini-web",
            "X-Conversation-Url": "http://127.0.0.1:8765/conversation/abc",
          },
        },
      );
    },
  });

  const health = await provider.healthCheck();
  assert.equal(health.available, true);
  assert.deepEqual(health.models, ["gemini-web"]);

  const result = await provider.ask({
    prompt: "Return exactly: GEMINI_PROVIDER_OK",
    mode: "oracle",
    correlationId: "corr-1",
  });
  assert.equal(result.provider, "gemini-web");
  assert.equal(result.executor, "aside-gemini");
  assert.equal(result.transport, "openai-compatible");
  assert.equal(result.status, "completed");
  assert.equal(result.response, "GEMINI_PROVIDER_OK");
  assert.equal(result.conversationUrl, "http://127.0.0.1:8765/conversation/abc");
  assert.equal(result.correlationId, "corr-1");
  assert.deepEqual(result.notes, ["server backend: gemini-web"]);
  assert.deepEqual(calls, [
    "http://127.0.0.1:8765/v1/models",
    "http://127.0.0.1:8765/v1/chat/completions",
  ]);
});

test("Gemini Web provider reports server unavailability as blocked", async () => {
  const provider = new GeminiWebProvider({
    baseUrl: "http://127.0.0.1:8765/v1",
    fetchImpl: async () => new Response("unavailable", { status: 503 }),
  });

  const result = await provider.ask({
    prompt: "hello",
    mode: "direct",
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.executor, "aside-gemini");
  assert.match(result.notes?.[0] ?? "", /503/);
});
