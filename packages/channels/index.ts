export type AsideChannelTransportId = "slack" | "telegram" | "developer-api";

export interface AsideChannelTransportInfo {
  id: AsideChannelTransportId;
  officialRemoteControl: boolean;
  chatgptCanSendAndRead: boolean;
  durableDeliveryDocumented: boolean;
  sessionControlDocumented: boolean;
  requiresAsideChannelSetup: boolean;
  notes: string;
}

export const ASIDE_CHANNEL_TRANSPORTS: Readonly<
  Record<AsideChannelTransportId, AsideChannelTransportInfo>
> = {
  slack: {
    id: "slack",
    officialRemoteControl: true,
    chatgptCanSendAndRead: true,
    durableDeliveryDocumented: true,
    sessionControlDocumented: false,
    requiresAsideChannelSetup: true,
    notes:
      "Aside's official 2026-08-04 changelog documents Channels remote control over Slack and Telegram with guided connection settings and durable delivery. ChatGPT can send/read Slack through a connected Slack plugin, so Slack is the preferred public bridge once the user's Aside Channel is configured.",
  },
  telegram: {
    id: "telegram",
    officialRemoteControl: true,
    chatgptCanSendAndRead: false,
    durableDeliveryDocumented: true,
    sessionControlDocumented: true,
    requiresAsideChannelSetup: true,
    notes:
      "Aside officially documents Telegram remote control and Telegram chat commands for session control. No direct Telegram messaging plugin is currently assumed by ASIDE-GPT.",
  },
  "developer-api": {
    id: "developer-api",
    officialRemoteControl: false,
    chatgptCanSendAndRead: false,
    durableDeliveryDocumented: false,
    sessionControlDocumented: false,
    requiresAsideChannelSetup: false,
    notes:
      "Aside advertises programmatic browser-agent runs for teams, but the public endpoint/auth/schema is not currently documented. Do not invent it.",
  },
};

export type AsideMobileBlockReason =
  | "aside-channel-setup-required"
  | "cloud-no-pc-execution-not-live-verified"
  | "chatgpt-transport-unavailable";

export interface AsideMobilePathInput {
  transport?: AsideChannelTransportId | undefined;
  asideChannelConfigured?: boolean | undefined;
  cloudNoPcExecutionLiveVerified?: boolean | undefined;
}

export interface AsideMobilePathDecision {
  transport: AsideChannelTransportInfo;
  ready: boolean;
  blockReason?: AsideMobileBlockReason | undefined;
  architecture: "chatgpt-slack-aside-channels-cloud" | "aside-channel-not-ready";
}

export function evaluateAsideMobilePath(
  input: AsideMobilePathInput = {},
): AsideMobilePathDecision {
  const transport = ASIDE_CHANNEL_TRANSPORTS[input.transport ?? "slack"];

  if (!transport.chatgptCanSendAndRead) {
    return {
      transport,
      ready: false,
      blockReason: "chatgpt-transport-unavailable",
      architecture: "aside-channel-not-ready",
    };
  }

  if (!input.asideChannelConfigured) {
    return {
      transport,
      ready: false,
      blockReason: "aside-channel-setup-required",
      architecture: "aside-channel-not-ready",
    };
  }

  if (!input.cloudNoPcExecutionLiveVerified) {
    return {
      transport,
      ready: false,
      blockReason: "cloud-no-pc-execution-not-live-verified",
      architecture: "aside-channel-not-ready",
    };
  }

  return {
    transport,
    ready: true,
    architecture: "chatgpt-slack-aside-channels-cloud",
  };
}

export const ASIDE_CHANNEL_FACTS = Object.freeze({
  officialChannelsRelease: "2026-08-04",
  slackRemoteControl: true,
  telegramRemoteControl: true,
  durableDelivery: true,
  telegramSessionControlCommands: true,
  cloudHandoffAdvertisedOnPro: true,
  cloudDeviceManagementDocumented: true,
  publicRemoteApiContractDocumented: false,
});
