# Remote adapter contract

This document defines the minimum interface ASIDE-GPT expects from an **official Aside remote integration**. It is an internal interface contract only; it does not claim that these HTTP endpoints or method names exist in Aside.

## Required operations

```ts
export interface AsideRemoteAdapter {
  submitTask(input: SubmitTaskInput): Promise<SubmitTaskResult>;
  getTask(taskId: string): Promise<TaskState>;
  respondToInput(taskId: string, response: UserInputResponse): Promise<TaskState>;
  cancelTask(taskId: string): Promise<TaskState>;
  getResult(taskId: string): Promise<TaskResult>;
}
```

## Required semantics

- `submitTask`: starts a real Aside browser-agent run through an official authorized surface.
- `getTask`: returns durable state such as queued/running/waiting-for-user/completed/failed/cancelled.
- `respondToInput`: relays an approval, rejection, answer, or other supported human input through the official Aside flow.
- `cancelTask`: requests cancellation using the official provider contract.
- `getResult`: retrieves final output and any official artifacts such as URLs, screenshots, files, or evidence links.

## Authentication

Authentication is provider-supplied. The adapter may accept an opaque authorized client supplied by the host runtime, but must never define its own guessed Aside bearer-token format or ask the user to paste secrets into chat.

## Transport mapping

When Aside publishes or grants access to an official API/SDK/Remote MCP/Channel surface, create one implementation of this interface that maps the official schema to the internal types. Keep provider-specific fields at the adapter boundary.

## Prohibited shortcuts

- no private endpoint reverse engineering
- no browser automation implementation inside the adapter
- no local-PC bridge in the primary path
- no fallback provider masquerading as Aside
