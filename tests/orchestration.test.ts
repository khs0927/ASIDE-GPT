import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseExecutor, planTask } from "../packages/orchestration/index.js";

test("routes a GitHub task to the connected app first", () => {
  const route = chooseExecutor({ request: "GitHub Actions 실패 이유를 확인해줘." });
  assert.equal(route.executor, "connected_app");
  assert.match(route.appHint ?? "", /GitHub/i);
  assert.equal(route.browserProvider, "work-native");
});

test("routes a generic website task to Work native browser", () => {
  const route = chooseExecutor({ request: "네이버에서 주문 배송상태 확인해줘." });
  assert.equal(route.executor, "work_native_browser");
  assert.equal(route.browserProvider, "work-native");
});

test("creates a hybrid plan for email plus current website prices", () => {
  const plan = planTask({
    request: "지난달 결제한 SaaS 영수증을 Gmail에서 찾고 현재 가격을 웹사이트에서 비교해줘.",
  });
  assert.equal(plan.route.executor, "hybrid");
  assert.equal(plan.policy.taskClass, "READ");
  assert.equal(plan.mustPauseBeforeAction, false);
  assert.ok(plan.steps.some((step) => step.kind === "evidence"));
});

test("adds an approval step for an external effect", () => {
  const plan = planTask({ request: "배송지를 입력하고 주문을 제출해줘." });
  assert.equal(plan.policy.taskClass, "EXTERNAL_EFFECT");
  assert.equal(plan.mustPauseBeforeAction, true);
  assert.ok(plan.steps.some((step) => step.id === "confirm"));
});
