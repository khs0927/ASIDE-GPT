import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { asideFragment, checkedBaseUrl, applyProvider, probeProvider, main } from '../scripts/setup-aside-gemini.mjs';

let dir;
before(async () => { dir = await mkdtemp(join(tmpdir(), 'aside-provider-')); });
after(async () => { await rm(dir, { recursive: true, force: true }); });

async function fakeApi({ withTools = true, models = ['gemini-2.5-pro'], status = 200 } = {}, task) {
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/v1/models') res.end(JSON.stringify({ data: models.map(id => ({ id })) }));
    else if (req.url === '/v1/chat/completions') {
      for await (const _ of req) { /* drain harmless probe */ }
      res.statusCode = status;
      res.end(JSON.stringify({ choices: [{ message: withTools
        ? { tool_calls: [{ type: 'function', function: { name: 'aside_bridge_probe', arguments: '{"ok":true}' } }] }
        : { content: 'I called aside_bridge_probe', tool_calls: [] },
      }] }));
    } else { res.statusCode = 404; res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await task(`http://127.0.0.1:${server.address().port}/v1`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('loopback-only proxy URLs prevent accidental session exposure', () => {
  assert.equal(checkedBaseUrl('http://localhost:8317/v1/'), 'http://localhost:8317/v1');
  assert.throws(() => checkedBaseUrl('https://some-host.example/v1'), /Only loopback/);
  assert.throws(() => checkedBaseUrl('http://192.168.0.100:8317/v1'), /Only loopback/);
  assert.throws(() => checkedBaseUrl('http://user:password@localhost:8317/v1'), /credentials/);
  assert.throws(() => checkedBaseUrl('http://127.0.0.1:8317/v1?key=x'), /query/);
});

test('fragment uses model-specific OpenAI-completions schema and no secrets', () => {
  const config = asideFragment({ providerId: 'gemini-cli-oauth', model: 'gemini-2.5-pro', baseUrl: 'http://127.0.0.1:8317/v1' });
  assert.equal(config.api, 'openai-completions');
  assert.equal(config.authHeader, false);
  assert.equal(config.models[0].id, 'gemini-2.5-pro');
  assert.ok(!JSON.stringify(config).includes('apiKey'));
  const keyed = asideFragment({ providerId: 'gemini-cli-oauth', model: 'gemini-2.5-pro', baseUrl: 'http://127.0.0.1:8317/v1', proxyKey: 'test-only-key' });
  assert.equal(keyed.authHeader, true);
  assert.equal(keyed.apiKey, 'test-only-key');
});

test('native tool_calls probe succeeds only with actual structured call', async () => {
  await fakeApi({}, async baseUrl => {
    const proof = await probeProvider({ baseUrl, model: 'gemini-2.5-pro' });
    assert.equal(proof.ok, true);
    assert.equal(proof.stage, 'tool-calls');
  });
});

test('text-only Gemini Web façade is not falsely certified as an Aside agent', async () => {
  await fakeApi({ withTools: false }, async baseUrl => {
    const proof = await probeProvider({ baseUrl, model: 'gemini-2.5-pro' });
    assert.equal(proof.ok, false);
    assert.match(proof.reason, /verified native tool_calls/);
  });
});

test('unadvertised model is rejected before any completion probe', async () => {
  await fakeApi({ models: ['other-model'] }, async baseUrl => {
    const proof = await probeProvider({ baseUrl, model: 'gemini-2.5-pro' });
    assert.equal(proof.ok, false);
    assert.equal(proof.stage, 'models');
  });
});

test('quota failure is not silently retried or certified', async () => {
  await fakeApi({ status: 429 }, async baseUrl => {
    const proof = await probeProvider({ baseUrl, model: 'gemini-2.5-pro' });
    assert.deepEqual({ ok: proof.ok, stage: proof.stage, reason: proof.reason }, { ok: false, stage: 'tool-calls', reason: 'HTTP 429' });
  });
});

test('apply refuses unverified adapters and leaves files untouched', async () => {
  const d = join(dir, 'refuse');
  await mkdir(d);
  await writeFile(join(d, 'models.json'), '{"providers":{"other":{"name":"keep"}}}\n');
  await assert.rejects(applyProvider({ asideDir: d, providerId: 'gemini-cli-oauth', model: 'model', baseUrl: 'http://127.0.0.1:8317/v1', verification: { ok: false } }), /Cannot apply/);
  assert.equal((await readdir(d)).length, 1);
});

test('verified apply preserves existing providers, creates backup, and is idempotent', async () => {
  const d = join(dir, 'apply');
  await mkdir(d);
  const original = '{"providers":{"my-existing":{"name":"Keep this"}},"otherSetting":123}\n';
  await writeFile(join(d, 'models.json'), original);
  const config = { asideDir: d, providerId: 'gemini-cli-oauth', model: 'gemini-2.5-pro', baseUrl: 'http://127.0.0.1:8317/v1', verification: { ok: true, stage: 'tool-calls' } };
  const done = await applyProvider(config);
  assert.equal(done.applied, true);
  assert.equal(await readFile(done.backup, 'utf8'), original);
  const newer = JSON.parse(await readFile(done.target, 'utf8'));
  assert.equal(newer.providers['my-existing'].name, 'Keep this');
  assert.equal(newer.otherSetting, 123);
  assert.equal(newer.providers['gemini-cli-oauth'].models[0].id, 'gemini-2.5-pro');
  const again = await applyProvider(config);
  assert.equal(again.applied, false);
  assert.equal(again.unchanged, true);
  assert.equal((await readdir(d)).filter(name => name.includes('.bak.')).length, 1);
  await assert.rejects(applyProvider({ ...config, model: 'new-model' }), /already exists/);
});

test('dry-run CLI returns fragment without touching filesystem or requesting a model', async () => {
  const d = join(dir, 'dry-run');
  await mkdir(d);
  const originalWrite = process.stdout.write;
  let output = '';
  process.stdout.write = chunk => { output += chunk; return true; };
  try { assert.equal(await main(['--aside-dir', d, '--model', 'gemini-2.5-pro']), 0); }
  finally { process.stdout.write = originalWrite; }
  assert.equal(JSON.parse(output).previewOnly, true);
  assert.deepEqual(await readdir(d), []);
});

test('Aside config is never initialized blindly when no Aside profile exists', async () => {
  const d = join(dir, 'absent');
  await mkdir(d);
  await assert.rejects(applyProvider({ asideDir: d, providerId: 'gemini-cli-oauth', model: 'gemini-2.5-pro', baseUrl: 'http://127.0.0.1:8317/v1', verification: { ok: true, stage: 'tool-calls' } }), /not found/);
  assert.deepEqual(await readdir(d), []);
});

test('invalid Aside config is not silently replaced', async () => {
  const d = join(dir, 'invalid');
  await mkdir(d);
  await writeFile(join(d, 'models.json'), '{ not json');
  await assert.rejects(applyProvider({ asideDir: d, providerId: 'gemini-cli-oauth', model: 'gemini-2.5-pro', baseUrl: 'http://127.0.0.1:8317/v1', verification: { ok: true, stage: 'tool-calls' } }), /invalid JSON/);
  assert.deepEqual(await readdir(d), ['models.json']);
});

test('CLI --check uses contract proof but performs no local Aside writes', async () => {
  await fakeApi({}, async baseUrl => {
    const d = join(dir, 'check');
    await mkdir(d);
    const originalWrite = process.stdout.write;
    let output = '';
    process.stdout.write = chunk => { output += chunk; return true; };
    try { assert.equal(await main(['--base-url', baseUrl, '--model', 'gemini-2.5-pro', '--aside-dir', d, '--check']), 0); }
    finally { process.stdout.write = originalWrite; }
    assert.equal(JSON.parse(output).verification.ok, true);
    assert.equal(JSON.parse(output).applied, false);
    assert.deepEqual(await readdir(d), []);
  });
});


test('client API key is sent as Bearer for both verification requests', async () => {
  const seen = [];
  const fake = async (_url, init) => {
    seen.push(init.headers?.authorization);
    return new Response(JSON.stringify(seen.length === 1
      ? { data: [{ id: 'gemini-2.5-pro' }] }
      : { choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'aside_bridge_probe', arguments: '{"ok":true}' } }] } }] }),
    { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const proof = await probeProvider({ baseUrl: 'http://127.0.0.1:8317/v1', model: 'gemini-2.5-pro', proxyKey: 'test-only-key', fetchImpl: fake });
  assert.equal(proof.ok, true);
  assert.deepEqual(seen, ['Bearer test-only-key', 'Bearer test-only-key']);
  assert.ok(!JSON.stringify(proof).includes('test-only-key'));
});

test('preview redacts a configured proxy key', async () => {
  const previous = process.env.CLIPROXYAPI_API_KEY;
  process.env.CLIPROXYAPI_API_KEY = 'a-pretend-client-key';
  const originalWrite = process.stdout.write;
  let output = '';
  process.stdout.write = chunk => { output += chunk; return true; };
  try { assert.equal(await main(['--model', 'gemini-2.5-pro']), 0); }
  finally {
    process.stdout.write = originalWrite;
    if (previous === undefined) delete process.env.CLIPROXYAPI_API_KEY;
    else process.env.CLIPROXYAPI_API_KEY = previous;
  }
  assert.equal(JSON.parse(output).fragment.apiKey, '[REDACTED]');
  assert.ok(!output.includes('a-pretend-client-key'));
});

test('CLI --apply performs the contract test and writes only models.json after verified tool call', async () => {
  await fakeApi({}, async baseUrl => {
    const d = join(dir, 'cli-apply');
    await mkdir(d);
    await writeFile(join(d, 'models.json'), '{"providers":{"other":{"name":"safe"}}}\n');
    const previous = process.env.CLIPROXYAPI_API_KEY;
    delete process.env.CLIPROXYAPI_API_KEY;
    const originalWrite = process.stdout.write;
    let output = '';
    process.stdout.write = chunk => { output += chunk; return true; };
    try { assert.equal(await main(['--base-url', baseUrl, '--aside-dir', d, '--model', 'gemini-2.5-pro', '--apply']), 0); }
    finally {
      process.stdout.write = originalWrite;
      if (previous !== undefined) process.env.CLIPROXYAPI_API_KEY = previous;
    }
    const result = JSON.parse(output);
    assert.equal(result.applied, true);
    assert.equal(result.verification.ok, true);
    assert.equal(JSON.parse(await readFile(join(d, 'models.json'), 'utf8')).providers.other.name, 'safe');
    assert.equal((await readdir(d)).length, 2);
  });
});

test('invalid structured tool arguments are never certified', async () => {
  for (const invalid of [
    { type: 'function', function: { name: 'aside_bridge_probe', arguments: '{"ok":false}' } },
    { type: 'function', function: { name: 'aside_bridge_probe', arguments: '{"ok":true,"extra":"bad"}' } },
    { type: 'function', function: { name: 'aside_bridge_probe', arguments: '"not an object"' } },
    { type: 'function', function: { name: 'aside_bridge_probe', arguments: 'INVALID' } },
    { type: 'function', function: { name: 'aside_bridge_probe', arguments: '{"ok":true' } },
    { type: 'function', function: { name: 'wrong', arguments: '{"ok":true}' } },
  ]) {
    let calls = 0;
    const mockFetch = async () => {
      calls += 1;
      return new Response(JSON.stringify(calls === 1
        ? { data: [{ id: 'gemini-2.5-pro' }] }
        : { choices: [{ message: { tool_calls: [invalid] } }] }), { status: 200 });
    };
    const result = await probeProvider({ baseUrl: 'http://127.0.0.1:8317/v1', model: 'gemini-2.5-pro', fetchImpl: mockFetch });
    assert.equal(result.ok, false);
    assert.equal(calls, 2);
  }
});

test('multiple tool calls, including unknown side effects, are not accepted as proof', async () => {
  let calls = 0;
  const mockFetch = async () => {
    calls += 1;
    return new Response(JSON.stringify(calls === 1
      ? { data: [{ id: 'gemini-2.5-pro' }] }
      : { choices: [{ message: { tool_calls: [
        { type: 'function', function: { name: 'aside_bridge_probe', arguments: '{"ok":true}' } },
        { type: 'function', function: { name: 'unknown', arguments: '{}' } },
      ] } }] }), { status: 200 });
  };
  const result = await probeProvider({ baseUrl: 'http://127.0.0.1:8317/v1', model: 'gemini-2.5-pro', fetchImpl: mockFetch });
  assert.equal(result.ok, false);
});
