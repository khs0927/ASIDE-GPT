# Providers

## Decision

`work-native` is the only active browser provider. It is a logical route to a browser that ChatGPT Work owns. The package does not contain a client because the supported integration is Work orchestration, not a public browser API.

`aside-cloud` is an optional future provider. The official Aside developer material reviewed for this migration documents a local CLI, local MCP command, browser automation REPL, and local task controls. It does not verify a public hosted execution API that can run without the user’s device. Therefore no Aside cloud endpoint, SDK, secret, or adapter is included.

`future-provider` is a placeholder for a provider only after its hosted runtime, authentication, data handling, and confirmation model are documented and approved. It must not be selected by default.

## Invariants

- Provider selection never asks the user to keep a PC, local browser, or CLI running.
- Connected apps are an executor class, not a fabricated browser provider.
- A provider adapter must not accept credentials pasted into chat.
- An external provider cannot bypass Work’s sign-in or confirmation boundary.
