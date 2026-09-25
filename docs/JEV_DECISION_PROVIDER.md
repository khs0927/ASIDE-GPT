# Jev 1.13 decision provider for ASIDE-GPT

## Purpose

Jev is a TypeSafe System One decision model, not a replacement conversational model or browser agent. ASIDE-GPT uses it as an auxiliary decision plane for bounded semantic judgments while the official Aside Browser Agent remains the browser executor.

```text
User goal
  -> ASIDE-GPT planner and policy
  -> Jev choice/noul/score decision (optional)
  -> threshold and confidence gate
  -> official Aside workflow or human confirmation
  -> evidence verification
```

## Implemented adapter

`packages/decisions/jev.ts` provides:

- typed `choice`, `noul`, and `score` questions;
- the OpenCode Zen `POST /v1/systemone` request;
- optional `Authorization: Bearer` support for authenticated OpenCode or TypeSafe access;
- bounded HTTP error reporting;
- request validation before network access;
- no logging or persistence of credentials;
- structured browser handoff checkpoints that preserve tab context while explicitly requiring a fresh Aside snapshot.

Every direct request must include `model`. Use `jev-1.13-free` with OpenCode Zen and `jev-1.13.0` with TypeSafe direct access. A conversational prompt or a request without `model` is invalid and may return HTTP 401 or 422.

The default model is `jev-1.13-free`. The default endpoint is `https://opencode.ai/zen/v1/systemone`. Anonymous Zen Free access was verified on 2026-09-24 and re-verified on 2026-09-26 for all three question types at zero cost, but the official documentation still describes the free model as limited-time. A production deployment should therefore support an authenticated endpoint and fail clearly if anonymous access is withdrawn.

For TypeSafe direct access, use:

```text
endpoint: https://api.typesafe.ai/v1/systemone
model: jev-1.13.0
```

## Verified request

```json
{
  "state": "결제 실패가 3일째 계속되어 판매를 잃고 있습니다. 지금 asap로 도와주세요.",
  "questions": {
    "is_urgent": {
      "type": "noul",
      "instructions": "이 메시지는 긴급함 또는 시간 민감성을 나타내는가?"
    },
    "department": {
      "type": "choice",
      "instructions": "어느 팀이 처리해야 하는가?",
      "criteria": {
        "billing": "결제와 구독 문제",
        "technical": "버그와 연동 문제",
        "other": "위 항목에 해당하지 않음"
      }
    }
  }
}
```

Verified response values from the anonymous Zen Free endpoint:

```json
{
  "model": "jev-1.13-free",
  "answers": {
    "is_urgent": { "type": "noul", "noul": 0.98 },
    "department": {
      "type": "choice",
      "choice": "billing",
      "confidence": 0.99,
      "probabilities": {
        "billing": 0.99,
        "technical": 0.01,
        "other": 0
      }
    }
  },
  "cost": "0"
}
```

These values are an integration smoke test, not a benchmark or a universal confidence threshold.

## Browser workflow checkpoint

When a Jev decision informs a browser task, preserve the existing browser tab and create `createJevDecisionCheckpoint(...)` before resuming. The checkpoint records:

- the source tab ID, URL, and page title when available;
- the purpose of the judgment;
- the model and typed answers returned by Jev;
- the next official Aside action;
- `requiresFreshSnapshot: true`;
- `browserActionAuthorized: false`.

After the decision, reattach to the same tab, take a fresh snapshot, and continue through the official Aside workflow. If Jev returns HTTP 401 or 422, correct the endpoint/model pair and rebuild the System One request without changing tabs or repeating browser actions. A Jev result is advisory classification evidence, not permission to submit, save, send, purchase, or otherwise mutate a page.

## Why Jev is not the main model

Jev returns typed judgments and probabilities rather than generated prose. A conversational adapter can echo the requested schema without evaluating it, so selecting `Jev 1.13 Free` as the main ASIDE-GPT chat model is unsafe and semantically wrong. The main planner/executor must remain a general-purpose model and the official Aside provider for browser work.

Use Jev only when the desired result is one or more of:

- one option from a known set (`choice`);
- probability that a single statement is true (`noul`);
- probability-weighted position on an ordered rubric (`score`).

Use normal code for exact arithmetic, database lookups, dates, counts, permissions, and final side effects.

## Official sources

- OpenCode Zen: https://opencode.ai/docs/zen
- TypeSafe documentation: https://docs.typesafe.ai/
- TypeSafe models and limits: https://docs.typesafe.ai/models
- TypeSafe quickstart: https://docs.typesafe.ai/introduction/quickstart
- Official TypeSafe agent skill: https://github.com/typesafe-ai/skills
- Official JavaScript SDK: https://github.com/typesafe-ai/typesafe-sdk-js
- Official Python SDK: https://github.com/typesafe-ai/typesafe-sdk-python
- Open-source System One alternative using open-weight models: https://github.com/ikermoel/open-alternative-jev

## Open-source boundary

The TypeSafe agent skill and both official SDK repositories are MIT-licensed. The ASIDE-GPT skill and adapter were adapted from those public interfaces and retain the required notice in `docs/licenses/TYPE_SAFE_AI_LICENSE.txt`.

Jev itself is not open source. TypeSafe has not published Jev weights or a standalone inference implementation. An open-source alternative can implement a similar decision layer, but it must not be described as the hosted `jev-1.13` model.
