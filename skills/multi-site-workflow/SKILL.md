---
name: multi-site-workflow
description: Use when one user request requires a connected app and one or more websites, such as receipts plus current prices or GitHub plus a deployment dashboard.
---

1. Split the request into bounded subgoals and identify which source owns each fact or action.
2. Route structured work to the matching connected app first: email, calendar, GitHub, documents, or another trusted app available in Work.
3. Route general or app-inaccessible web work to Work’s native cloud browser. Do not invent a Cloud Browser API or ask the user to run an external browser node.
4. Pass only the minimum necessary values between subgoals. Keep source URLs and timestamps with each value.
5. Re-classify each proposed action. A read-only first half does not make a later write or external effect safe to perform automatically.
6. Before a state-changing or consequential action, show the target, exact change, and expected effect. Wait for the host confirmation flow when required.
7. Verify each source and reconcile conflicts. Return a combined report that distinguishes observed facts, inferences, and actions actually completed.

Example: for “find SaaS services paid last month and identify price increases,” search receipts in the connected email app, extract service names and prior prices, inspect current pricing in Work’s cloud browser, compare like-for-like plans, and report sources. Do not change subscriptions or purchase anything.
