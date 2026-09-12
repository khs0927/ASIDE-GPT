import type { ApprovalRequest, TaskPolicy } from "../schemas/index.js";
import { requiresConfirmation } from "../policies/index.js";

export function createApprovalRequest(
  policy: TaskPolicy,
  summary: string,
  action: string,
): ApprovalRequest | null {
  if (policy.taskClass === "READ" || !requiresConfirmation(policy)) {
    return null;
  }

  return {
    taskClass: policy.taskClass,
    risk: policy.risk,
    summary,
    action,
    status: "pending",
  };
}

export function approvalBoundary(policy: TaskPolicy): string {
  if (policy.taskClass === "READ") {
    return "Continue automatically, subject to the host product's safety checks.";
  }
  if (policy.taskClass === "WRITE") {
    return "Pause before the first state-changing action and show the exact target and proposed change.";
  }
  return "Pause immediately before the consequential action and request explicit user confirmation.";
}
