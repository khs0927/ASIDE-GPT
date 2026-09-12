# Work handoff

This branch continues directly from `work/mobile-cloud-browser-v2`.

## What changed after Work's PR #3

Work correctly removed the invalid user-PC/local-node requirement, but its research conclusion made Work Browser the primary provider and treated Aside as an unverified future provider.

Follow-up research found newer official Aside product evidence:

- Pro pricing advertises `Channels (Remote control)`.
- Pro pricing advertises `Cloud handoff`.
- Team/scale pricing advertises browser-agent runs started from apps, cron jobs, or internal tools.
- Aside changelog includes account/device management for active cloud devices.

Therefore the project now uses `aside-official-remote` as the primary provider and treats the remaining gap as an **access/integration-contract gap**, not proof that remote Aside capability does not exist.

## Work continuation rule

When Work resumes this repository:

1. Preserve the Aside-first provider decision in ADR-0002.
2. Do not restore silent Work Browser fallback.
3. If an official Aside remote endpoint/OAuth/Remote MCP/Channel contract becomes available, implement only a thin adapter around that official contract.
4. Do not reverse-engineer private Aside endpoints.
5. Keep the user-PC/local-node prototype under `legacy/local-node/` only.
6. Run `npm run ci` before changing PR status or merging.
