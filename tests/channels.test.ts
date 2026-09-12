import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ASIDE_CHANNEL_FACTS,
  ASIDE_CHANNEL_TRANSPORTS,
  evaluateAsideMobilePath,
} from "../packages/channels/index.js";

test("Slack is the preferred ChatGPT-callable official Aside Channel transport", () => {
  const slack = ASIDE_CHANNEL_TRANSPORTS.slack;
  assert.equal(slack.officialRemoteControl, true);
  assert.equal(slack.chatgptCanSendAndRead, true);
  assert.equal(slack.durableDeliveryDocumented, true);
});

test("a missing Aside Channel blocks instead of fabricating a destination", () => {
  const decision = evaluateAsideMobilePath();
  assert.equal(decision.ready, false);
  assert.equal(decision.blockReason, "aside-channel-setup-required");
});

test("configured Slack still requires a real no-PC cloud smoke test", () => {
  const decision = evaluateAsideMobilePath({ asideChannelConfigured: true });
  assert.equal(decision.ready, false);
  assert.equal(decision.blockReason, "cloud-no-pc-execution-not-live-verified");
});

test("Slack + configured Aside Channel + verified cloud execution is ready", () => {
  const decision = evaluateAsideMobilePath({
    asideChannelConfigured: true,
    cloudNoPcExecutionLiveVerified: true,
  });
  assert.equal(decision.ready, true);
  assert.equal(decision.architecture, "chatgpt-slack-aside-channels-cloud");
});

test("public facts distinguish Channels from an undocumented developer API", () => {
  assert.equal(ASIDE_CHANNEL_FACTS.slackRemoteControl, true);
  assert.equal(ASIDE_CHANNEL_FACTS.cloudHandoffAdvertisedOnPro, true);
  assert.equal(ASIDE_CHANNEL_FACTS.publicRemoteApiContractDocumented, false);
});
