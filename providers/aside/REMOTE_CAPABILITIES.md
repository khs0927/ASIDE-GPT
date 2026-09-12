# Aside Remote Capability Matrix

Aside is the target browser-execution provider for ASIDE-GPT.

## Verified product capabilities

| Capability | Status | Official source |
| --- | --- | --- |
| Browser-agent execution | verified | https://aside.com/ and developer docs |
| Channels (Remote control) | verified product feature | https://aside.com/pricing |
| Cloud handoff | verified product feature | https://aside.com/pricing |
| Start browser-agent runs from app / cron / internal tools | verified product feature, team/contact-sales | https://aside.com/pricing |
| Cloud devices | verified concept | https://docs.aside.com/changelog/components |
| Local CLI / MCP / REPL | verified | https://docs.aside.com/help/developers |

## Integration details not publicly verified

The following must not be guessed:

- public remote task URL
- public Remote MCP URL
- REST path names
- OAuth client/scopes
- token format
- run-status schema
- approval callback/event schema
- screenshot/artifact API
- semantics of `Cloud handoff` when no local device is online
- exact programmatic surface behind app/cron/internal-tool triggered runs

## Provider rule

ASIDE-GPT should prefer official Aside remote execution when a supported access contract is available.

Until that contract is available, the provider is `documented-but-not-configurable`, not `unsupported` and not a fake implementation.

Work-native browser execution is a separate fallback provider. It must never be reported as an Aside execution success.
