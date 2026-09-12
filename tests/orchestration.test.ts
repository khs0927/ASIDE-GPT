import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseExecutor, planTask } from "../packages/orchestration/index.js";

test("routes a non-browser GitHub task to the connected app", () => {
  const route = chooseExecutor({ request: "GitHub 저장소의 열린 이슈를 확인해줘." });
  assert.equal(route.executor, "connected_app");
  assert.match(route.appHint ?? "", /GitHub/i);
});

test("blocks a generic browser task instead of silently replacing Aside", () => {
  const route = chooseExecutor({ request: "네이버에서 주문 배송상태 확인해줘." });
  assert.equal(route.executor, "blocked");
  assert.equal(route.browserProvider, "aside-official-remote");
  assert.equal(route.fallback, "ask-user");
});

test("uses Aside when an official remote surface is connected", () => {
  const route = chooseExecutor({
    request: "네이버에서 주문 배송상태 확인해줘.",
    asideRemoteAvailable: true,
  });
  assert.equal(route.executor, "aside_remote");
  assert.equal(route.browserProvider, "aside-official-remote");
});

test("uses Work browser only after explicit fallback opt-in", () => {
  const route = chooseExecutor({
    request: "네이버에서 주문 배송상태 확인해줘.",
    allowWorkFallback: true,
  });
  assert.equal(route.executor, "work_native_browser");
  assert.equal(route.browserProvider, "work-native");
});

test("creates a blocked hybrid plan until Aside remote access is connected", () => {
  const plan = planTask({
    request: "지난달 결제한 SaaS 영수증을 Gmail에서 찾고 현재 가격을 웹사이트에서 비교해줘.",
  });
  assert.equal(plan.route.executor, "blocked");
  assert.equal(plan.policy.taskClass, "READ");
  assert.equal(plan.mustPauseBeforeAction, false);
  assert.equal(plan.steps.some((step) => step.kind === "evidence"), false);
});

test("adds an approval step for an external effect when Aside is connected", () => {
  const plan = planTask({
    request: "배송지를 입력하고 주문을 제출해줘.",
    asideRemoteAvailable: true,
  });
  assert.equal(plan.policy.taskClass, "EXTERNAL_EFFECT");
  assert.equal(plan.mustPauseBeforeAction, true);
  assert.ok(plan.steps.some((step) => step.id === "confirm"));
});
