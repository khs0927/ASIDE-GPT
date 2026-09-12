export const TASK_CLASSES = ["READ", "WRITE", "EXTERNAL_EFFECT"] as const;
export type TaskClass = (typeof TASK_CLASSES)[number];

export const RISK_LEVELS = ["low", "moderate", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CONFIRMATION_MODES = [
  "none",
  "before_write",
  "before_external_effect",
  "always",
] as const;
export type ConfirmationMode = (typeof CONFIRMATION_MODES)[number];

export const EXECUTORS = [
  "aside_remote_browser",
  "work_native_browser",
] as const;
export type Executor = (typeof EXECUTORS)[number];

export type ConfirmationStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "declined"
  | "not_applicable";

export type AsideBlockedReason =
  | "aside-channel-setup-required"
  | "cloud-no-pc-execution-not-live-verified"
  | "official-aside-access-required";

export interface TaskRequest {
  request: string;
  /** Explicit opt-in to a non-Aside fallback. */
  allowNonAsideFallback?: boolean | undefined;
  /** True only after an existing Slack conversation is proven to be connected to official Aside Channels. */
  asideChannelConfigured?: boolean | undefined;
  /** True only after a live test proves the Aside task runs with no local user PC/Mac/Aside process online. */
  cloudNoPcExecutionLiveVerified?: boolean | undefined;
}

export interface TaskPolicy {
  taskClass: TaskClass;
  risk: RiskLevel;
  confirmation: ConfirmationMode;
  reasons: readonly string[];
}

export interface RouteDecision {
  executor: Executor;
  browserProvider: "aside-remote" | "work-native";
  asideTransport: "channels-slack" | "official-api" | "none";
  asideExecution: boolean;
  ready: boolean;
  blockedReason?: AsideBlockedReason | undefined;
  fallback: "work-native-browser" | "none";
  reason: string;
}

export interface PlanStep {
  id: string;
  kind: "classify" | "route" | "execute" | "confirm" | "verify" | "evidence";
  instruction: string;
}

export interface BrowserTaskPlan {
  request: string;
  policy: TaskPolicy;
  route: RouteDecision;
  steps: readonly PlanStep[];
  mustPauseBeforeAction: boolean;
}

export interface Evidence {
  finalUrl: string;
  pageTitle: string;
  importantValues: Readonly<Record<string, string | number | boolean | null>>;
  timestamp: string;
  actions: readonly string[];
  confirmationStatus: ConfirmationStatus;
  screenshots?: readonly string[];
  sourceLinks?: readonly string[];
}

export interface EvidenceValidation {
  valid: boolean;
  missing: readonly string[];
}

export interface ApprovalRequest {
  taskClass: Exclude<TaskClass, "READ">;
  risk: RiskLevel;
  summary: string;
  action: string;
  status: "pending" | "approved" | "declined";
}
