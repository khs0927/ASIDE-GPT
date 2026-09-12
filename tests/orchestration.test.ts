import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseExecutor, planTask } from "../packages/orchestration/index.js";

test("routes browser work to Aside remote by default", () => {
  const route = chooseExecutor({ request: "네이버에서 주문 배송상태 확인해줘." });
  assert.equal(route.executor, "aside_remote_browser");
  assert.equal(route.browserProvider, "aside-remote");
  assert.equal(route.asideExecution, true);
  assert.equal(route.ready, false);
  assert.equal(route.blockedReason, "official-aside-access-required");
});

test("does not silently replace Aside for a GitHub browser task", () => {
  const route = chooseExecutor({ request: "Aside로 GitHub Actions 실패 원인을 브라우저에서 확인해줘." });
  assert.equal(route.browserProvider, "aside-remote");
  assert.equal(route.fallback, "none");
  assert.equal(route.asideExecution, true);
});

test("allows Work-native only after explicit fallback opt-in", () => {
  const route = chooseExecutor({
    request: "네이버에서 주문 배송상태 확인해줘.",
    allowNonAsideFallback: true,
  });
  assert.equal(route.executor, "work_native_browser");
  assert.equal(route.browserProvider, "work-native");
  assert.equal(route.asideExecution, false);
  assert.equal(route.ready, true);
  assert.equal(route.fallback, "work-native-browser");
});

test("blocked Aside plan explains the official-access boundary", () => {
  const plan = planTask({ request: "지난달 결제한 SaaS 가격을 여러 사이트에서 비교해줘." });
  assert.equal(plan.route.executor, "aside_remote_browser");
  assert.equal(plan.policy.taskClass, "READ");
  assert.equal(plan.mustPauseBeforeAction, false);
  assert.match(plan.steps.find((step) => step.id === "execute")?.instruction ?? "", /official-aside-access-required/);
  assert.ok(plan.steps.some((step) => step.kind === "evidence"));
});

test("adds an approval step for an external effect", () => {
  const plan = planTask({ request: "배송지를 입력하고 주문을 제출해줘." });
  assert.equal(plan.policy.taskClass, "EXTERNAL_EFFECT");
  assert.equal(plan.mustPauseBeforeAction, true);
  assert.ok(plan.steps.some((step) => step.id === "confirm"));
});
