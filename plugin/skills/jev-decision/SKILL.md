---
name: jev-decision
description: Use Jev 1.13 for bounded semantic decisions such as choice, noul probability, score rubric, routing, classification, evidence checks, ranking, and confidence-aware human review.
---

# Jev decision

## Goal

Use Jev as a typed decision function inside a broader ASIDE-GPT workflow. Jev does not generate normal chat prose, browse websites, retrieve evidence, calculate exact values, or perform actions. The orchestrator and the official Aside Browser Agent retain those responsibilities.

## Workflow

1. Determine whether the request is genuinely a bounded semantic decision. If it requires current facts, code generation, long-form explanation, tool use, arithmetic, date comparison, or external effects, use the normal ASIDE-GPT route.
2. Build one `state` object containing only the text or structured records needed for the judgment.
3. Split the decision into independent atomic questions:
   - `choice` for one of a defined option set;
   - `noul` for the probability that one statement is true;
   - `score` for an ordered, concrete rubric.
4. Send independent questions together through the dedicated System One adapter. Do not send a normal chat-completions prompt to Jev.
5. Inspect the returned probabilities and confidence. Threshold in code, not in prose.
6. Route uncertain or consequential results to the current general model, the official Aside workflow, or a human for confirmation.
7. Report the model version, typed answer, probabilities/confidence, and the reason for any escalation. Never claim that a decision itself is proof of correctness.

## Limits

- Jev is a proprietary hosted model. Its SDK and workflow code are open source, but its weights and inference implementation are not published.
- `jev-1.13-free` through OpenCode Zen is limited-time. If anonymous access stops, require a supported OpenCode or TypeSafe provider key configured outside chat. Never paste or persist a key in conversation.
- English is the primary supported language. Korean and other CJK inputs work in testing, but validate representative domain cases and confidence before relying on them.
- Jev must not replace the official Aside browser provider and must never be labeled as browser execution.

## Safety and confirmation

A Jev decision is advisory data, not permission. Sending messages, purchasing, deleting, publishing, changing settings, or other external effects still requires the normal ASIDE-GPT and Aside confirmation boundary. If the decision is uncertain or the action is consequential, ask for confirmation before continuing.

## Source

See `docs/JEV_DECISION_PROVIDER.md` in the ASIDE-GPT repository for architecture, official sources, licensing boundaries, and the verified request/response example.
