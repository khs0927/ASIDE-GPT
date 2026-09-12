# Security

ASIDE-GPT bridges a remote AI client to a browser that may already be authenticated to important accounts. Treat the gateway and node as privileged infrastructure.

## Non-negotiable rules

- Never return passwords, passkeys, cookies, bearer tokens, recovery codes, private keys, or complete browser profile data through MCP.
- Never add a generic remote shell tool to the ChatGPT-facing MCP server.
- Never disable or bypass Aside's sensitive-action confirmation mechanisms.
- Keep the node outbound-only. Do not expose the Aside CLI or browser debugging port directly to the internet.
- Use HTTPS for any non-local gateway connection.
- Use a high-entropy shared secret for the MVP and rotate it if exposed.
- Do not commit `.env`, browser profiles, task transcripts, screenshots containing secrets, or credentials.

## Consequential actions

Payments, purchases, public posts, outbound messages, account/security changes, deletion, and other consequential actions should require an explicit user approval boundary. The current MVP marks interactive MCP browser tools as potentially destructive and preserves Aside's own approval behavior.

A future mobile approval protocol must pause the task and resume it after an authenticated approval. It must not simulate approval automatically.

## Reporting

Do not open a public issue containing credentials or private browser data. Provide a minimal reproduction with sensitive values removed.
