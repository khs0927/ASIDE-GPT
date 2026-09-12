import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CREDENTIAL_RULE,
  UNTRUSTED_WEB_CONTENT_RULE,
  classifyTask,
} from "../packages/policies/index.js";

test("classifies Korean status lookup as READ", () => {
  const policy = classifyTask("네이버에서 주문 배송상태 확인해줘.");
  assert.equal(policy.taskClass, "READ");
  assert.equal(policy.confirmation, "none");
  assert.equal(policy.risk, "low");
});

test("classifies form entry as WRITE", () => {
  const policy = classifyTask("관리 페이지의 폼에 주소를 입력하고 저장해줘.");
  assert.equal(policy.taskClass, "WRITE");
  assert.equal(policy.confirmation, "before_write");
});

test("classifies an imperative fix request as WRITE", () => {
  const policy = classifyTask("GitHub Actions 실패 원인을 확인하고 해결 가능한 부분은 처리해줘.");
  assert.equal(policy.taskClass, "WRITE");
  assert.equal(policy.confirmation, "before_write");
});

test("classifies purchase as critical EXTERNAL_EFFECT", () => {
  const policy = classifyTask("이 상품을 구매하고 결제해줘.");
  assert.equal(policy.taskClass, "EXTERNAL_EFFECT");
  assert.equal(policy.risk, "critical");
  assert.equal(policy.confirmation, "before_external_effect");
});

test("exports injection and credential rules", () => {
  assert.match(UNTRUSTED_WEB_CONTENT_RULE, /untrusted data/i);
  assert.match(CREDENTIAL_RULE, /password/i);
  assert.match(CREDENTIAL_RULE, /secure/i);
});
