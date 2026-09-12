# Provider Priority

1. **Aside Remote (primary target)** — use only through an official supported remote/cloud contract. Browser work is executed by Aside.
2. **Work-native (fallback / research)** — useful for browser work when the user explicitly accepts a non-Aside fallback. It does not satisfy ASIDE-GPT's core success criterion.
3. **Legacy local node (archived)** — historical prototype only. It violates the no-PC requirement and is never the default.

A missing public Aside API contract must produce an explicit `official_access_required` state, not an automatic silent fallback that is reported as Aside.
