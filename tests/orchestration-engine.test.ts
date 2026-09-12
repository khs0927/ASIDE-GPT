import assert from "node:assert/strict";
import { test } from "node:test";
import { AsideOrchestrator } from "../packages/orchestration/engine.js";
import type {
  AsideRemoteAdapter,
  AsideRemoteSubmitInput,
  AsideRemoteTaskResult,
  AsideRemoteTaskState,
  AsideRemoteUserResponse,
} from "../packages/providers/remote-contract.js";
import { TaskLedger } from "../packages/runtime/index.js";

class FixtureAdapter implements AsideRemoteAdapter {
  state: AsideRemoteTaskState = { taskId: "aside-1", status: "running" };
  resultValue: AsideRemoteTaskResult = {
    taskId: "aside-1",
    summary: "Finished",
    finalUrl: "https://example.com/final",
  };
  submitCalls = 0;
  responseCalls = 0;
  requestKey?: string;
  submitImpl?: (input: AsideRemoteSubmitInput) => Promise<AsideRemoteTaskState>;
  lookupValue: AsideRemoteTaskState | null = null;

  async submitTask(input: AsideRemoteSubmitInput): Promise<AsideRemoteTaskState> {
    this.submitCalls += 1;
    this.requestKey = input.clientRequestKey;
    if (this.submitImpl) return this.submitImpl(input);
    return this.state;
  }
  async getTask(taskId: string): Promise<AsideRemoteTaskState> {
    assert.equal(taskId, this.state.taskId);
    return this.state;
  }
  async findTaskByClientRequestKey(clientRequestKey: string): Promise<AsideRemoteTaskState | null> {
    assert.equal(clientRequestKey, this.requestKey);
    return this.lookupValue;
  }
  async respondToInput(taskId: string, _response: AsideRemoteUserResponse): Promise<AsideRemoteTaskState> {
    assert.equal(taskId, this.state.taskId);
    this.responseCalls += 1;
    return this.state;
  }
  async cancelTask(taskId: string): Promise<AsideRemoteTaskState> {
    assert.equal(taskId, this.state.taskId);
    this.state = { taskId, status: "cancelled" };
    return this.state;
  }
  async getResult(taskId: string): Promise<AsideRemoteTaskResult> {
    assert.equal(taskId, this.resultValue.taskId);
    return this.resultValue;
  }
}

function fixture(adapter?: AsideRemoteAdapter, timeoutMs = 1000, now = 1000) {
  const ledger = new TaskLedger(":memory:", () => now);
  const engine = new AsideOrchestrator("tenant", ledger, adapter, timeoutMs, () => now);
  return { ledger, engine };
}

test("orchestrator fails closed without an official Aside adapter", async () => {
  const { ledger, engine } = fixture();
  try {
    const result = await engine.start("run", { request: "배송 상태를 확인해줘" });
    assert.equal(result.kind, "blocked");
    assert.equal(result.plan.route.browserProvider, "aside-remote");
    assert.equal(result.plan.route.ready, false);
    assert.throws(() => ledger.get("tenant", "run"), /Run not found/);
  } finally {
    ledger.close();
  }
});

test("explicit non-Aside fallback becomes a handoff, not fake Aside execution", async () => {
  const { ledger, engine } = fixture();
  try {
    const result = await engine.start("run", {
      request: "배송 상태를 확인해줘",
      allowNonAsideFallback: true,
    });
    assert.equal(result.kind, "fallback-handoff");
    assert.equal(result.plan.route.asideExecution, false);
    assert.throws(() => ledger.get("tenant", "run"), /Run not found/);
  } finally {
    ledger.close();
  }
});

test("connected adapter makes Aside route ready and submits through durable dispatcher", async () => {
  const adapter = new FixtureAdapter();
  const { ledger, engine } = fixture(adapter);
  try {
    const result = await engine.start("run", { request: "대시보드 값을 읽어줘" });
    assert.equal(result.kind, "submitted");
    if (result.kind !== "submitted") return;
    assert.equal(result.plan.route.ready, true);
    assert.equal(result.plan.route.asideExecution, true);
    assert.equal(result.record.state, "running");
    assert.equal(result.record.vendorRunId, "aside-1");
    assert.equal(adapter.submitCalls, 1);
    assert.match(adapter.requestKey ?? "", /^[a-f0-9]{64}$/);
  } finally {
    ledger.close();
  }
});

test("ambiguous submit never resubmits and reconciles by client request key", async () => {
  const adapter = new FixtureAdapter();
  adapter.submitImpl = async () => new Promise<AsideRemoteTaskState>(() => undefined);
  const { ledger, engine } = fixture(adapter, 5);
  try {
    const started = await engine.start("run", { request: "상태 확인" });
    assert.equal(started.kind, "submitted");
    if (started.kind !== "submitted") return;
    assert.equal(started.record.state, "uncertain");
    assert.equal(adapter.submitCalls, 1);

    adapter.lookupValue = { taskId: "aside-1", status: "running" };
    const reconciled = await engine.reconcile("run");
    assert.equal(reconciled.state, "running");
    assert.equal(reconciled.vendorRunId, "aside-1");
    assert.equal(adapter.submitCalls, 1);
  } finally {
    ledger.close();
  }
});

test("approval is bound to exact canonical action and resumes only after provider acknowledgement", async () => {
  const adapter = new FixtureAdapter();
  const { ledger, engine } = fixture(adapter, 1000, 1000);
  try {
    await engine.start("run", { request: "주문을 제출해줘" });
    adapter.state = {
      taskId: "aside-1",
      status: "waiting_for_user",
      waiting: {
        kind: "approval",
        approvalId: "approval-1",
        canonicalAction: "purchase:item-1:KRW10000",
        expiresAt: 2000,
      },
    };
    const pending = await engine.sync("run");
    assert.equal(pending.record.state, "waiting_approval");
    assert.match(pending.record.approval?.actionDigest ?? "", /^[a-f0-9]{64}$/);

    adapter.state = { taskId: "aside-1", status: "running" };
    const approved = await engine.respond("run", { type: "approve" });
    assert.equal(approved.record.state, "running");
    assert.equal(approved.record.approval, undefined);
    assert.equal(adapter.responseCalls, 1);
  } finally {
    ledger.close();
  }
});

test("sign-in waits for official secure UI and rejects chat answers", async () => {
  const adapter = new FixtureAdapter();
  const { ledger, engine } = fixture(adapter);
  try {
    await engine.start("run", { request: "로그인된 관리자 페이지를 확인해줘" });
    adapter.state = {
      taskId: "aside-1",
      status: "waiting_for_user",
      waiting: { kind: "signin", prompt: "Sign in securely" },
    };
    const waiting = await engine.sync("run");
    assert.equal(waiting.record.state, "waiting_signin");
    await assert.rejects(engine.respond("run", { type: "answer", text: "secret" }), /secure Aside authorization UI/);
    assert.equal(adapter.responseCalls, 0);
  } finally {
    ledger.close();
  }
});

test("completed Aside result is accepted only with matching final evidence", async () => {
  const adapter = new FixtureAdapter();
  const { ledger, engine } = fixture(adapter, 1000, 1000);
  try {
    await engine.start("run", { request: "최종 상태 확인" });
    adapter.state = { taskId: "aside-1", status: "completed" };
    const synced = await engine.sync("run");
    assert.equal(synced.record.state, "completed");
    assert.equal(synced.record.evidence?.provider, "aside");
    assert.equal(synced.record.evidence?.vendorRunId, "aside-1");
    assert.equal(synced.record.evidence?.finalUrl, "https://example.com/final");
    const result = await engine.result("run");
    assert.equal(result.summary, "Finished");
  } finally {
    ledger.close();
  }
});

test("completed provider state without final URL stays unverified", async () => {
  const adapter = new FixtureAdapter();
  adapter.resultValue = { taskId: "aside-1", summary: "No URL evidence" };
  const { ledger, engine } = fixture(adapter);
  try {
    await engine.start("run", { request: "최종 상태 확인" });
    adapter.state = { taskId: "aside-1", status: "completed" };
    const synced = await engine.sync("run");
    assert.equal(synced.record.state, "running");
    assert.equal(synced.warning, "result-missing-final-url");
  } finally {
    ledger.close();
  }
});
