# Remote Activation Checklist

Preferred activation path: official Aside Channels over Slack.

## A. One-time Channel setup

- [ ] Aside account/plan exposes `Channels (Remote control)`.
- [ ] Connect Aside Channels to the intended Slack workspace/conversation using Aside's official UI.
- [ ] Confirm ChatGPT has access to that Slack workspace through its supported Slack connector.
- [ ] Identify the exact Aside-connected Slack conversation. Do not infer connection from the channel name alone.
- [ ] Send one harmless read-only message through the Channel and verify the response is from the Aside Channel flow.

## B. Required no-PC Cloud handoff smoke test

- [ ] Confirm `Cloud handoff` is available on the intended Aside account/plan.
- [ ] Stop or disconnect every user-owned PC/Mac/local Aside process that could execute the task.
- [ ] From mobile ChatGPT, send a harmless public-page task through the verified Slack Channel.
- [ ] Verify the task actually starts or continues under Aside while no local user device is online.
- [ ] Verify the returned result identifies the requested public page correctly.
- [ ] Record only non-sensitive evidence: timestamp, task instruction, Channel/thread reference, public URL, public page title, and completion state.

Do not mark the no-PC path ready unless this succeeds.

## C. Mobile question/approval round trip

- [ ] Start a non-destructive task that causes Aside to ask a question or request confirmation.
- [ ] Verify the prompt reaches the Slack Channel and can be read from ChatGPT.
- [ ] Present the exact action/question to the user.
- [ ] Relay the user's explicit answer/approval through Slack.
- [ ] Verify Aside resumes and completes or safely stops.
- [ ] Verify a declined or missing approval is never interpreted as approval.

## D. Completion evidence

- [ ] Provider is recorded as `Aside via Channels/Slack`.
- [ ] Browser executor is verified to be Aside.
- [ ] No user PC/Mac/local daemon was required during the test.
- [ ] Final result/evidence is returned to mobile ChatGPT.
- [ ] No passwords, OTPs, cookies, passkeys, tokens, or vault values were copied into chat or source control.
- [ ] Run repository CI after any code/config change.

## E. Optional direct developer transport

Aside's team offering advertises browser-agent runs started from apps, cron jobs, or internal tools. If Aside publishes or grants an official API/SDK/Remote MCP contract, it may be added as an additional transport.

For that optional path verify:

- [ ] official authentication/OAuth method;
- [ ] remote task submission;
- [ ] status/follow-up/continuation;
- [ ] approval events and resume;
- [ ] result/screenshots/artifacts;
- [ ] revocation;
- [ ] no-PC live execution.

Never reverse engineer a private Aside endpoint merely to avoid the supported Channels path.
