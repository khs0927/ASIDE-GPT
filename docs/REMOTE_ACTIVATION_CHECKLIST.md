# Remote Activation Checklist

Use this checklist when Aside publishes or grants access to the remote/cloud integration contract.

- [ ] Confirm source is official Aside documentation, dashboard, SDK, or support-provided developer access.
- [ ] Identify supported auth method without copying credentials into source control.
- [ ] Verify a task can be created with no user PC/Mac online.
- [ ] Verify the browser executor is Aside.
- [ ] Verify task status can be read remotely.
- [ ] Verify follow-up/steering or continuation.
- [ ] Verify approval-required events can be surfaced to the mobile user.
- [ ] Verify approval/deny can resume or terminate the run through a supported interface.
- [ ] Verify final output and any supported screenshots/artifacts can be retrieved.
- [ ] Verify access can be revoked.
- [ ] Add only the documented adapter contract.
- [ ] Add redacted integration tests/mocks based on the official schema.
- [ ] Run CI.
- [ ] Perform one read-only live smoke test.
- [ ] Perform one approval-gated non-destructive live smoke test.

Do not mark remote execution `ready` until the live no-PC smoke test proves that the run survives without a local Aside Browser process.
