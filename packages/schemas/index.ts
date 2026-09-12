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
  "connected_app",
  "aside_remote",
  "work_native_browser",
  "hybrid",
  "blocked",
] as const;
export type Executor = (typeof EXECUTORS)[number];

export type ConfirmationStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "declined"
  | "not_applicable";

export type BrowserPreference = "aside" | "work";

export interface TaskRequest {
  request: string;
  availableApps?: readonly string[];
  browserPreference?: BrowserPreference;
  /** True only when an official Aside remote surface is actually connected/authorized. */
  asideRemoteAvailable?: boolean;
  /** Explicit user opt-in to substitute ChatGPT Work's browser when Aside remote is unavailable. */
  allowWorkFallback?: boolean;
}

export interface TaskPolicy {
  taskClass: TaskClass;
  risk: RiskLevel;
  confirmation: ConfirmationMode;
  reasons: readonly string[];
}

export interface RouteDecision {
  executor: Executor;
  appHint?: string;
  browserProvider: "aside-official-remote" | "work-native";
  fallback: "work-native-browser" | "ask-user" | "none";
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
