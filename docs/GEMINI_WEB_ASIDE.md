# Gemini Web via Aside

## Decision

For the first implementation, Gemini is used exactly as a normal signed-in website inside Aside.

```text
User / outer orchestrator
        |
        v
      Aside
        |
        v
 gemini.google.com
        |
        v
 Google AI Pro web session
```

This deliberately avoids a second Playwright/CDP runtime, AI Studio API keys, Antigravity, cookie extraction, and reverse-engineered Gemini HTTP endpoints.

Aside already provides the browser harness, logged-in browser context, semantic page inspection, Playwright-like automation, and approval boundaries. Adding another browser automation layer would duplicate the strongest part of Aside and increase maintenance.

## Open-source patterns reused

The implementation plan borrows patterns, not runtime dependencies, from current Gemini browser projects:

- `lesterppo/hermes-gem-pw`: browser-first Gemini operation, model verification, locale-tolerant recovery, and no API-key requirement.
- `YosefHayim/ai-browser-bridge`: Gemini as a provider-shaped web surface with captured replies.
- `HGD-coder/mcp-web-llm`: normalized model-web result handling.

ASIDE-GPT does not vendor those browser engines because Aside itself remains the executor.

## Aside oracle mode

The intended high-value path is not only "ask Gemini and return its answer". Aside can use Gemini Web as a bounded reasoning subcall while it continues to own browser execution.

```text
Aside task
   |
   +--> needs extra reasoning
   |        |
   |        v
   |   Gemini background tab
   |        |
   |        v
   |   Gemini response
   |        |
   +<-------+
   |
   v
Aside continues the original task
```

The Gemini response is advisory context only. It does not inherit browser authority and cannot bypass the original task's approval or privacy boundary.

## Phase 1 — direct Gemini chat + oracle subcall

Acceptance criteria:

1. Aside opens `gemini.google.com`.
2. Existing Google sign-in is reused without exposing credentials.
3. Aside can create/use a chat, submit one prompt, and recover the final response.
4. If a model is explicitly requested, Aside selects it and verifies the visible label.
5. Visible Gemini usage-limit/cooldown messages produce a clean `blocked` result and no retry loop.
6. The returned result identifies `provider=gemini-web` and `executor=aside`.
7. Oracle mode can return to the original task without losing the original tab/task state.

## Phase 2 — reliability

After the basic flow is proven, add:

- response-stability detection;
- prompt de-duplication after timeouts;
- account/model verification;
- source-link capture;
- conversation continuation;
- structured error classification;
- optional automatic fallback only when the user enables it.

## Phase 3 — richer Gemini web features

Defer these until plain chat is reliable:

- file upload;
- Deep Research;
- Gems;
- Canvas;
- image generation;
- Spark.

Each richer feature should remain a separate capability so a UI change does not break basic chat.

## Smoke-test prompts

### Read-only basic test

```text
Use the currently signed-in Gemini website.
Start a new chat and ask exactly:
"Reply with only: ASIDE_GEMINI_OK"
Do not change account settings, do not upload files, and do not use an API.
Return the visible model label, final URL, and Gemini's exact response.
```

Pass condition: the final response contains `ASIDE_GEMINI_OK` and the run used Aside's real browser session.

### Limit handling test

If the selected model displays a usage-limit or cooldown message, do not switch models automatically. Return `status=blocked`, the visible model label, and a short description of the visible limit message.

## Security boundary

Never use browser cookies or Google session tokens as application credentials. Do not copy them into logs, GitHub, prompts, environment variables, or chat. A fresh Google sign-in is performed only through the normal browser UI.

## Relationship to ASIDE-GPT

`gemini-web` is a target-site skill, not a new browser provider. The browser provider remains `aside-remote`; Gemini is simply the website that Aside operates.

This preserves the repository's rule that ASIDE-GPT success means the actual browser work is performed by Aside.

## Oracle smoke test

```text
Keep this task in Aside. Open Gemini in a separate background tab and ask:
"Give exactly three concise checks for verifying that a web form was submitted successfully. Do not ask for credentials."

Capture Gemini's answer, return to the original task, and report:
- provider=gemini-web
- executor=aside
- visible model label
- the three checks

Do not perform any form submission during this smoke test.
```

Pass condition: Aside obtains the Gemini answer and returns to the original task context without giving Gemini browser authority.
