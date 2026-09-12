# Work / ChatGPT Handoff

This file exists so parallel agents do not lose the corrected product goal.

## Shared conclusion

The earlier Work implementation correctly removed the mandatory user-PC/local-node runtime and produced useful safety, routing, approval, evidence, and plugin-skill scaffolding.

However, Work's PR #3 made the native ChatGPT Work Cloud Browser the primary browser provider. That is a valid fallback architecture but it is not the ASIDE-GPT success path because Aside no longer performs the browser work.

Subsequent cross-checking found stronger official Aside evidence:

- Pro pricing explicitly lists `Channels (Remote control)`.
- Pro pricing explicitly lists `Cloud handoff`.
- Team/contact-sales pricing explicitly says browser-agent runs can be started from an app, cron jobs, or internal tools.
- The official changelog includes cloud-device management.

Therefore the project must not classify Aside remote execution as simply unsupported.

The precise shared verdict is:

> Aside remote/cloud execution is an officially advertised product capability, but the external developer contract needed for direct ChatGPT integration is not publicly documented in the currently indexed developer docs.

## Ownership

Work-created policies, schemas, approvals, evidence validation, skills and tests are reusable.

The primary provider decision must be corrected so that:

1. Aside Remote is the desired provider.
2. Work-native browser is a fallback only.
3. No undocumented Aside endpoint is fabricated.
4. Activation waits only for the official remote integration contract / access entitlement.

## Do not regress

Do not reintroduce a required user PC, localhost bridge, tunnel, local Aside CLI, or private browser daemon.

Do not declare Work Cloud Browser execution to be an Aside execution.
