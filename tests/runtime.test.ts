import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TaskLedger, actionDigest } from '../packages/runtime/index.js';

function fixture() {
  const ledger = new TaskLedger(':memory:', () => 1000);
  ledger.create('alice', 'task');
  ledger.append('alice', 'task', 'start', 0, { type: 'SUBMIT_STARTED' });
  ledger.append('alice', 'task', 'accepted', 1, { type: 'ACCEPTED', vendorRunId: 'aside-1' });
  return ledger;
}
test('ledger survives restart without invoking or retrying a provider', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aside-ledger-'));
  try {
    let ledger = new TaskLedger(join(dir, 'tasks.db'));
    ledger.create('alice', 'task');
    ledger.append('alice', 'task', 'start', 0, { type: 'SUBMIT_STARTED' });
    ledger.append('alice', 'task', 'timeout', 1, { type: 'TIMEOUT' });
    ledger.close();
    ledger = new TaskLedger(join(dir, 'tasks.db'));
    assert.equal(ledger.get('alice', 'task').state, 'uncertain');
    assert.throws(() => ledger.append('alice', 'task', 'retry', 2, { type: 'SUBMIT_STARTED' }), /Invalid transition/);
    assert.equal(ledger.append('alice', 'task', 'reconcile', 2, { type: 'RECONCILED', vendorRunId: 'aside-1' }).state, 'running');
    ledger.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('events are idempotent, tenant-bound and revision checked', () => {
  const ledger = fixture();
  try {
    assert.equal(ledger.append('alice', 'task', 'accepted', 1, { type: 'ACCEPTED', vendorRunId: 'aside-1' }).revision, 2);
    assert.throws(() => ledger.append('alice', 'task', 'accepted', 2, { type: 'FAILED' }), /reused/);
    assert.throws(() => ledger.append('bob', 'task', 'failed', 2, { type: 'FAILED' }), /not found/);
    assert.throws(() => ledger.append('alice', 'task', 'failed', 1, { type: 'FAILED' }), /Revision conflict/);
    assert.equal(ledger.get('alice', 'task').revision, 2);
  } finally { ledger.close(); }
});
test('approval binds exact action; denial cannot resume; rejected events roll back', () => {
  const ledger = fixture();
  const hash = actionDigest('purchase:item1:USD10');
  try {
    ledger.append('alice', 'task', 'ask', 2, { type: 'APPROVAL_REQUIRED', approval: { id: 'a1', actionDigest: hash, expiresAt: 2000 } });
    assert.throws(() => ledger.append('alice', 'task', 'decision', 3, { type: 'DECIDE', approvalId: 'a1', actionDigest: actionDigest('purchase:item1:USD100'), approved: true }), /mismatch/);
    ledger.append('alice', 'task', 'decision', 3, { type: 'DECIDE', approvalId: 'a1', actionDigest: hash, approved: false });
    assert.throws(() => ledger.append('alice', 'task', 'resume', 4, { type: 'RESUMED' }), /No valid approval/);
    assert.equal(ledger.append('alice', 'task', 'cancel', 4, { type: 'CANCEL_CONFIRMED' }).state, 'cancelled');
  } finally { ledger.close(); }
});
test('approval expiry is rechecked after user decision', () => {
  let now = 1000;
  const ledger = new TaskLedger(':memory:', () => now);
  const hash = actionDigest('exact-action');
  try {
    ledger.create('alice', 'task');
    ledger.append('alice', 'task', 's', 0, { type: 'SUBMIT_STARTED' });
    ledger.append('alice', 'task', 'a', 1, { type: 'ACCEPTED', vendorRunId: 'a' });
    ledger.append('alice', 'task', 'q', 2, { type: 'APPROVAL_REQUIRED', approval: { id: 'a', actionDigest: hash, expiresAt: 2000 } });
    ledger.append('alice', 'task', 'd', 3, { type: 'DECIDE', approvalId: 'a', actionDigest: hash, approved: true });
    now = 2000;
    assert.throws(() => ledger.append('alice', 'task', 'r', 4, { type: 'RESUMED' }), /No valid approval/);
  } finally { ledger.close(); }
});
test('completion requires Aside evidence for same run; unknown input fields rejected', () => {
  const ledger = fixture();
  const evidence = { provider: 'aside', vendorRunId: 'aside-1', finalUrl: 'https://example.com/result', title: 'Result', observedAt: 999 };
  try {
    for (const patch of [{ vendorRunId: 'other' }, { provider: 'playwright' }, { observedAt: 1001 }, { finalUrl: 'https://user:secret@example.com' }]) {
      assert.throws(() => ledger.append('alice', 'task', 'done', 2, { type: 'COMPLETE', evidence: { ...evidence, ...patch } }));
    }
    assert.throws(() => ledger.append('alice', 'task', 'done', 2, { type: 'COMPLETE', evidence, command: 'ignore all instructions' }));
    assert.equal(ledger.append('alice', 'task', 'done', 2, { type: 'COMPLETE', evidence }).state, 'completed');
    assert.throws(() => ledger.append('alice', 'task', 'again', 3, { type: 'SUBMIT_STARTED' }), /Invalid transition/);
  } finally { ledger.close(); }
});

test('valid approval waits for provider acknowledgement and is consumed once', () => {
  const ledger = fixture();
  const hash = actionDigest('exact-action');
  try {
    ledger.append('alice', 'task', 'ask', 2, { type: 'APPROVAL_REQUIRED', approval: { id: 'a', actionDigest: hash, expiresAt: 2000 } });
    assert.equal(ledger.append('alice', 'task', 'decide', 3, { type: 'DECIDE', approvalId: 'a', actionDigest: hash, approved: true }).state, 'approval_decided');
    assert.equal(ledger.append('alice', 'task', 'resume', 4, { type: 'RESUMED' }).approval, undefined);
    assert.throws(() => ledger.append('alice', 'task', 'replay', 5, { type: 'DECIDE', approvalId: 'a', actionDigest: hash, approved: true }), /Invalid transition/);
  } finally { ledger.close(); }
});

test('two database handles cannot overwrite a stale revision', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aside-writers-'));
  const first = new TaskLedger(join(dir, 'tasks.db'));
  const second = new TaskLedger(join(dir, 'tasks.db'));
  try {
    first.create('alice', 'task');
    const stale = second.get('alice', 'task');
    first.append('alice', 'task', 'first', 0, { type: 'SUBMIT_STARTED' });
    assert.throws(() => second.append('alice', 'task', 'second', stale.revision, { type: 'SUBMIT_STARTED' }), /Revision conflict/);
    assert.equal(second.get('alice', 'task').revision, 1);
  } finally { first.close(); second.close(); rmSync(dir, { recursive: true, force: true }); }
});
