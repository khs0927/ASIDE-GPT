import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskLedger } from '../packages/runtime/index.js';
import { TaskDispatcher, requestKey, type AsideTaskPort } from '../packages/runtime/dispatcher.js';

function setup(port?: AsideTaskPort, timeout = 1000) {
  const ledger = new TaskLedger(':memory:');
  ledger.create('tenant', 'task');
  return { ledger, service: new TaskDispatcher(ledger, port, timeout) };
}
const fixturePort = (): AsideTaskPort => ({
  available: true,
  async submit() { return { vendorRunId: 'fixture-run' }; },
  async lookup() { return { vendorRunId: 'fixture-run' }; },
});

test('default dispatcher blocks before mutation or network access', async () => {
  const { ledger, service } = setup();
  try {
    await assert.rejects(service.submit('tenant', 'task', 'read status'), /official-aside-access-required/);
    assert.equal(ledger.get('tenant', 'task').revision, 0);
  } finally { ledger.close(); }
});

test('parallel submissions call port once; invalid inputs never claim dispatch', async () => {
  let calls = 0;
  const port = fixturePort();
  port.submit = async () => { calls++; return { vendorRunId: 'fixture-run' }; };
  const { ledger, service } = setup(port);
  try {
    await assert.rejects(service.submit('tenant', 'task', '   '));
    await assert.rejects(service.submit('wrong-tenant', 'task', 'read'), /not found/);
    assert.equal(calls, 0);
    const results = await Promise.allSettled([
      service.submit('tenant', 'task', 'read'), service.submit('tenant', 'task', 'read'),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(calls, 1);
    assert.equal(ledger.get('tenant', 'task').state, 'running');
  } finally { ledger.close(); }
});

test('timeout ignores late response and reconciles without another submit', async () => {
  let resolve!: (value: unknown) => void;
  let signal: AbortSignal | undefined;
  let calls = 0;
  const port = fixturePort();
  port.submit = async (_request, receivedSignal) => {
    calls++; signal = receivedSignal;
    return new Promise(accept => { resolve = accept; });
  };
  const { ledger, service } = setup(port, 5);
  try {
    assert.equal((await service.submit('tenant', 'task', 'read')).state, 'uncertain');
    assert.equal(signal?.aborted, true);
    resolve({ vendorRunId: 'late-response' });
    await Promise.resolve();
    assert.equal(ledger.get('tenant', 'task').vendorRunId, undefined);
    await assert.rejects(service.submit('tenant', 'task', 'read'), /already dispatched/);
    assert.equal((await service.reconcile('tenant', 'task')).vendorRunId, 'fixture-run');
    assert.equal(calls, 1);
  } finally { ledger.close(); }
});

test('crash window recovery and unknown lookup never authorize resubmission', async () => {
  const port = fixturePort();
  port.lookup = async () => null;
  const { ledger, service } = setup(port);
  try {
    ledger.append('tenant', 'task', 'crash', 0, { type: 'SUBMIT_STARTED' });
    assert.equal((await service.reconcile('tenant', 'task')).state, 'uncertain');
    await assert.rejects(service.submit('tenant', 'task', 'read'), /already dispatched/);
  } finally { ledger.close(); }
});

test('malformed provider response becomes uncertain, never success', async () => {
  const port = fixturePort();
  port.submit = async () => ({ vendorRunId: '', secret: 'must not persist' });
  const { ledger, service } = setup(port);
  try { assert.equal((await service.submit('tenant', 'task', 'read')).state, 'uncertain'); }
  finally { ledger.close(); }
});

test('provider ingress cannot approve actions or address another vendor run', async () => {
  const { ledger, service } = setup(fixturePort());
  try {
    await service.submit('tenant', 'task', 'read');
    assert.throws(() => service.ingest('tenant', 'task', 'other-run', 'e', 2, { type: 'FAILED' }), /mismatch/);
    assert.throws(() => service.ingest('tenant', 'task', 'fixture-run', 'e', 2,
      { type: 'DECIDE', approvalId: 'a', actionDigest: 'a'.repeat(64), approved: true } as never), /cannot issue/);
    assert.equal(service.ingest('tenant', 'task', 'fixture-run', 'done', 2, {
      type: 'COMPLETE', evidence: { provider: 'aside', vendorRunId: 'fixture-run',
        finalUrl: 'https://example.com', title: 'Fixture result', observedAt: Date.now() },
    }).state, 'completed');
  } finally { ledger.close(); }
});

test('request keys separate tenants and delimiter collisions', () => {
  assert.equal(requestKey('a', 'b'), requestKey('a', 'b'));
  assert.notEqual(requestKey('a:b', 'c'), requestKey('a', 'b:c'));
  assert.notEqual(requestKey('a', 'task'), requestKey('b', 'task'));
});
