export type AsideRemoteTaskStatus =
  | "queued"
  | "running"
  | "waiting_for_user"
  | "completed"
  | "failed"
  | "cancelled";

export type AsideRemoteWaitingInput =
  | {
      kind: "approval";
      approvalId: string;
      canonicalAction: string;
      expiresAt: number;
      prompt?: string;
    }
  | {
      kind: "signin";
      prompt?: string;
    }
  | {
      kind: "question";
      prompt: string;
    };

export interface AsideRemoteTaskState {
  taskId: string;
  status: AsideRemoteTaskStatus;
  sessionId?: string;
  message?: string;
  waiting?: AsideRemoteWaitingInput;
}

export interface AsideRemoteSubmitInput {
  instruction: string;
  permissionMode?: "read_only" | "guard" | "full_access";
  /** Stable connector-generated key for official idempotency/recovery surfaces that support it. */
  clientRequestKey?: string;
}

export interface AsideRemoteTaskResult {
  taskId: string;
  sessionId?: string;
  summary: string;
  finalUrl?: string;
  screenshots?: readonly string[];
  files?: readonly string[];
  sourceLinks?: readonly string[];
}

export type AsideRemoteUserResponse =
  | { type: "approve" }
  | { type: "reject"; reason?: string }
  | { type: "answer"; text: string };

/**
 * Internal target contract for an official Aside remote integration.
 *
 * This interface intentionally contains no URL, OAuth client details, token format,
 * or transport assumptions. Implement it only when Aside exposes or authorizes an
 * official remote API, SDK, Remote MCP, Channel, or equivalent surface.
 */
export interface AsideRemoteAdapter {
  submitTask(input: AsideRemoteSubmitInput): Promise<AsideRemoteTaskState>;
  getTask(taskId: string): Promise<AsideRemoteTaskState>;
  /** Optional safe recovery hook when the official contract supports lookup by connector request key. */
  findTaskByClientRequestKey?(clientRequestKey: string): Promise<AsideRemoteTaskState | null>;
  respondToInput(taskId: string, response: AsideRemoteUserResponse): Promise<AsideRemoteTaskState>;
  cancelTask(taskId: string): Promise<AsideRemoteTaskState>;
  getResult(taskId: string): Promise<AsideRemoteTaskResult>;
}
