# Providers

## Decision

`aside-remote` is the primary target provider because ASIDE-GPT succeeds only when Aside performs the browser work.

Official Aside product material verifies `Channels (Remote control)`, `Cloud handoff`, and team/contact-sales support for browser-agent runs triggered from apps, cron jobs, or internal tools. The public developer documentation currently does not publish the remote endpoint/auth/schema required to call those capabilities directly from ChatGPT, so the provider state is `official-access-required` rather than `unsupported` or `available`.

`work-native` is an explicit fallback. It uses the browser ChatGPT Work owns and therefore is not Aside execution. It may only be selected after an explicit non-Aside fallback opt-in and must be labeled accordingly.

`future-provider` remains a placeholder for another documented hosted runtime. It must never silently replace Aside.

## Invariants

- Provider selection never requires the user to keep a PC, local browser, or CLI running.
- Browser tasks default to `aside-remote`.
- Missing official Aside access blocks at the integration boundary rather than silently switching engines.
- Work-native fallback requires explicit opt-in.
- A Work-native result does not count as an Aside result.
- No provider adapter may accept passwords, cookies, passkeys, OTP seeds, or raw browser-profile data pasted into chat.
- Aside's own approval and credential boundaries must remain authoritative when its remote contract is activated.
- Undocumented private endpoints must not be reverse engineered into the production connector.

See `ASIDE_REMOTE_FEASIBILITY.md` for evidence and `ASIDE_ACCESS_REQUEST.md` for the minimum official contract needed to activate the thin connector.
