import { randomUUID } from "node:crypto";
import type {
  AsideRemoteAdapter,
  AsideRemoteTaskResult,
  AsideRemoteTaskState,
  AsideRemoteUserResponse,
} from "../providers/remote-contract.js";
import { actionDigest, TaskLedger, type RunRecord } from "../runtime/index.js";
import { TaskDispatcher, type AsideTaskPort } from "../runtime/dispatcher.js";
import type { BrowserTaskPlan, TaskRequest } from "../schemas/index.js";
import { planTask } from "./index.js";

export type OrchestrationWarning =
  | "provider-waiting-without-structured-input"
  | "result-missing-final-url"
  | "provider-response-uncertain";

export interface OrchestrationSyncResult {
  record: RunRecord;
  remoteState: AsideRemoteTaskState;
  result?: AsideRemoteTaskResult;
  warning?: OrchestrationWarning;
}

export type OrchestrationStartResult =
  | {
      kind: "blocked";
      plan: BrowserTaskPlan;
      reason: "official-aside-access-required";
    }
  | {
      kind: "fallback-handoff";
      plan: BrowserTaskPlan;
      executor: "work_native_browser";
    }
  | {
      kind: "submitted";
      plan: BrowserTaskPlan;
      record: RunRecord;
    };

/**
 * Maps the transport-neutral official Aside adapter onto the durable dispatcher.
 * No endpoint, token, OAuth flow, or protocol is assumed here.
 */
export function createAsideTaskPort(adapter: AsideRemoteAdapter): AsideTaskPort {
  return {
    available: true,
    async submit(request, signal) {
      if (signal.aborted) throw new Error("Provider request aborted before submit");
      const state = await adapter.submitTask({
        instruction: request.instruction,
        clientRequestKey: request.requestKey,
      });
      if (signal.aborted) throw new Error("Provider request deadline exceeded after submit");
      if (!state.taskId) throw new Error("Provider did not return a task identifier");
      return { vendorRunId: state.taskId };
    },
    async lookup(request, signal) {
      if (signal.aborted) throw new Error("Provider request aborted before lookup");
      if (!adapter.findTaskByClientRequestKey) return null;
      const state = await adapter.findTaskByClientRequestKey(request.requestKey);
      if (signal.aborted) throw new Error("Provider lookup deadline exceeded");
      return state ? { vendorRunId: state.taskId } : null;
    },
  };
}

function terminal(state: RunRecord["state"]): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

/**
 * High-level orchestration layer used by a future ChatGPT/Aside connector host.
 * It is safe to construct without an adapter: all Aside execution then fails closed.
 */
export class AsideOrchestrator {
  private readonly dispatcher?: TaskDispatcher;

  constructor(
    private readonly tenant: string,
    private readonly ledger: TaskLedger,
    private readonly adapter?: AsideRemoteAdapter,
    timeoutMs = 30_000,
    private readonly clock: () => number = Date.now,
  ) {
    if (adapter) this.dispatcher = new TaskDispatcher(ledger, createAsideTaskPort(adapter), timeoutMs);
  }

  plan(request: TaskRequest): BrowserTaskPlan {
    return planTask({
      ...request,
      asideRemoteAvailable: this.adapter !== undefined,
    });
  }

  async start(runId: string, request: TaskRequest): Promise<OrchestrationStartResult> {
    const plan = this.plan(request);

    if (plan.route.executor === "work_native_browser") {
      return { kind: "fallback-handoff", plan, executor: "work_native_browser" };
    }

    if (!plan.route.ready || !this.dispatcher) {
      return { kind: "blocked", plan, reason: "official-aside-access-required" };
    }

    this.ledger.create(this.tenant, runId);
    const record = await this.dispatcher.submit(this.tenant, runId, request.request);
    return { kind: "submitted", plan, record };
  }

  async reconcile(runId: string): Promise<RunRecord> {
    if (!this.dispatcher) throw new Error("official-aside-access-required");
    return this.dispatcher.reconcile(this.tenant, runId);
  }

  async sync(runId: string): Promise<OrchestrationSyncResult> {
    const adapter = this.requireAdapter();
    let current = this.ledger.get(this.tenant, runId);
    if (!current.vendorRunId) throw new Error("Run has no provider task identifier");
    if (terminal(current.state)) {
      const remoteState = await adapter.getTask(current.vendorRunId);
      this.assertTaskIdentity(current.vendorRunId, remoteState);
      return { record: current, remoteState };
    }

    const remoteState = await adapter.getTask(current.vendorRunId);
    this.assertTaskIdentity(current.vendorRunId, remoteState);

    if (remoteState.status === "queued") return { record: current, remoteState };

    if (remoteState.status === "running") {
      if (current.state === "approval_decided" && current.approved === true) {
        current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "RESUMED" });
      } else if (current.state === "waiting_signin") {
        current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "RESUMED" });
      }
      return { record: current, remoteState };
    }

    if (remoteState.status === "waiting_for_user") {
      const waiting = remoteState.waiting;
      if (!waiting) {
        return { record: current, remoteState, warning: "provider-waiting-without-structured-input" };
      }

      if (waiting.kind === "approval") {
        const digest = actionDigest(waiting.canonicalAction);
        if (current.state === "waiting_approval") {
          if (current.approval?.id !== waiting.approvalId || current.approval.actionDigest !== digest) {
            throw new Error("Provider approval changed while another approval is pending");
          }
          return { record: current, remoteState };
        }
        if (current.state !== "running") throw new Error("Approval received in invalid local state");
        current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, {
          type: "APPROVAL_REQUIRED",
          approval: {
            id: waiting.approvalId,
            actionDigest: digest,
            expiresAt: waiting.expiresAt,
          },
        });
        return { record: current, remoteState };
      }

      if (waiting.kind === "signin") {
        if (current.state === "waiting_signin") return { record: current, remoteState };
        if (current.state !== "running") throw new Error("Sign-in request received in invalid local state");
        current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "SIGNIN_REQUIRED" });
        return { record: current, remoteState };
      }

      return { record: current, remoteState };
    }

    if (remoteState.status === "failed") {
      if (!terminal(current.state)) {
        current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "FAILED" });
      }
      return { record: current, remoteState };
    }

    if (remoteState.status === "cancelled") {
      if (!terminal(current.state)) {
        current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "CANCEL_CONFIRMED" });
      }
      return { record: current, remoteState };
    }

    const result = await adapter.getResult(current.vendorRunId);
    if (result.taskId !== current.vendorRunId) throw new Error("Provider result task mismatch");
    if (!result.finalUrl) {
      return { record: current, remoteState, result, warning: "result-missing-final-url" };
    }
    current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, {
      type: "COMPLETE",
      evidence: {
        provider: "aside",
        vendorRunId: current.vendorRunId,
        finalUrl: result.finalUrl,
        title: result.summary.slice(0, 1000),
        observedAt: this.clock(),
      },
    });
    return { record: current, remoteState, result };
  }

  async respond(runId: string, response: AsideRemoteUserResponse): Promise<OrchestrationSyncResult> {
    const adapter = this.requireAdapter();
    let current = this.ledger.get(this.tenant, runId);
    if (!current.vendorRunId) throw new Error("Run has no provider task identifier");

    if (current.state === "waiting_signin") {
      throw new Error("Sign-in must be completed through the official secure Aside authorization UI; chat input is not accepted");
    }

    if (response.type === "approve" || response.type === "reject") {
      if (current.state !== "waiting_approval" || !current.approval) {
        throw new Error("No matching approval is pending");
      }
      current = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, {
        type: "DECIDE",
        approvalId: current.approval.id,
        actionDigest: current.approval.actionDigest,
        approved: response.type === "approve",
      });
    }

    let remoteState: AsideRemoteTaskState;
    try {
      remoteState = await adapter.respondToInput(current.vendorRunId, response);
    } catch {
      return {
        record: current,
        remoteState: {
          taskId: current.vendorRunId,
          status: "waiting_for_user",
          message: "Provider response delivery is uncertain; reconcile before retrying.",
        },
        warning: "provider-response-uncertain",
      };
    }

    this.assertTaskIdentity(current.vendorRunId, remoteState);
    return this.applyAcknowledgement(runId, current, remoteState);
  }

  async cancel(runId: string): Promise<OrchestrationSyncResult> {
    const adapter = this.requireAdapter();
    const current = this.ledger.get(this.tenant, runId);
    if (!current.vendorRunId) throw new Error("Run has no provider task identifier");
    const remoteState = await adapter.cancelTask(current.vendorRunId);
    this.assertTaskIdentity(current.vendorRunId, remoteState);
    return this.applyAcknowledgement(runId, current, remoteState);
  }

  async result(runId: string): Promise<AsideRemoteTaskResult> {
    const adapter = this.requireAdapter();
    const current = this.ledger.get(this.tenant, runId);
    if (current.state !== "completed" || !current.vendorRunId) throw new Error("Run is not completed");
    const result = await adapter.getResult(current.vendorRunId);
    if (result.taskId !== current.vendorRunId) throw new Error("Provider result task mismatch");
    return result;
  }

  private async applyAcknowledgement(
    runId: string,
    current: RunRecord,
    remoteState: AsideRemoteTaskState,
  ): Promise<OrchestrationSyncResult> {
    if (remoteState.status === "cancelled") {
      const record = terminal(current.state)
        ? current
        : this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "CANCEL_CONFIRMED" });
      return { record, remoteState };
    }
    if (remoteState.status === "failed") {
      const record = terminal(current.state)
        ? current
        : this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "FAILED" });
      return { record, remoteState };
    }
    if (remoteState.status === "running" && current.state === "approval_decided" && current.approved === true) {
      const record = this.ledger.append(this.tenant, runId, randomUUID(), current.revision, { type: "RESUMED" });
      return { record, remoteState };
    }
    return { record: current, remoteState };
  }

  private requireAdapter(): AsideRemoteAdapter {
    if (!this.adapter) throw new Error("official-aside-access-required");
    return this.adapter;
  }

  private assertTaskIdentity(expected: string, state: AsideRemoteTaskState): void {
    if (state.taskId !== expected) throw new Error("Provider task mismatch");
  }
}
