#!/usr/bin/env node
/**
 * Safe Aside custom-provider registration for a local OpenAI-compatible bridge.
 * No Google cookies, passwords, OAuth tokens, or browser profiles are read.
 * Provider schema adapted independently from the published AIMI example
 * (https://github.com/TH33ORACL3/aimi, MIT); no AIMI source code is copied.
 */
import { chmod, copyFile, lstat, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE = 'http://127.0.0.1:8317/v1';
const DEFAULT_DIR = join(homedir(), '.aside', 'u', '0');
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const IDENTIFIER = /^[a-z][a-z0-9._-]{0,63}$/i;

export function checkedBaseUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('Invalid bridge URL'); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new Error('Bridge URL must not contain credentials, query, or fragment');
  if (!LOCAL_HOSTS.has(parsed.hostname) || parsed.protocol !== 'http:')
    throw new Error('Only loopback HTTP is supported. Never expose a signed-in Google session or local proxy to the network.');
  const path = parsed.pathname.replace(/\/+$/, '');
  if (path !== '/v1') throw new Error('OpenAI-compatible base URL must end with /v1');
  return `${parsed.origin}${path}`;
}

export function checkedId(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value))
    throw new Error(`${label} must be a short alphanumeric model/provider identifier`);
  return value;
}

export function asideFragment({ providerId, model, baseUrl, proxyKey }) {
  const url = checkedBaseUrl(baseUrl);
  checkedId(providerId, 'provider');
  if (typeof model !== 'string' || !model || !/^[a-zA-Z0-9][a-zA-Z0-9:._/-]{0,127}$/.test(model))
    throw new Error('Invalid model ID');
  return {
    name: `Gemini OAuth bridge (${providerId})`,
    baseUrl: url,
    api: 'openai-completions',
    authHeader: Boolean(proxyKey),
    ...(proxyKey ? { apiKey: proxyKey } : {}),
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      maxTokensField: 'max_tokens',
      supportsStrictMode: false,
      supportsLongCacheRetention: false,
    },
    models: [{
      id: model,
      name: `Gemini via verified proxy (${model})`,
      reasoning: false,
      input: ['text'],
      // Conservative bridge policy caps, NOT upstream model capability claims.
      contextWindow: 8192,
      maxTokens: 2048,
    }],
  };
}

async function requestJson(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal, redirect: 'error' });
    let payload;
    try { payload = await res.json(); } catch { return { ok: false, reason: `invalid JSON from ${new URL(url).pathname}` }; }
    return { ok: res.ok, status: res.status, payload };
  } catch (error) {
    return { ok: false, reason: error?.name === 'AbortError' ? 'timeout' : 'connection failed' };
  } finally {
    clearTimeout(timer);
  }
}

/** Verify that the model exists AND produces native structured tool calls.
 * This costs one model request against the connected provider's quota.
 * It does not execute the offered tool or accept a text imitation of a call.
 */
export async function probeProvider({ baseUrl, model, proxyKey, fetchImpl = fetch, timeoutMs = 20000 }) {
  const url = checkedBaseUrl(baseUrl);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000)
    throw new Error('timeoutMs must be 100..120000');
  const authHeaders = proxyKey ? { authorization: `Bearer ${proxyKey}` } : {};
  const models = await requestJson(fetchImpl, `${url}/models`, { method: 'GET', headers: authHeaders }, timeoutMs);
  if (!models.ok) return { ok: false, stage: 'models', reason: models.reason ?? `HTTP ${models.status}` };
  if (!Array.isArray(models.payload?.data) || !models.payload.data.some(item => item?.id === model))
    return { ok: false, stage: 'models', reason: 'requested model not advertised by upstream' };

  const probe = await requestJson(fetchImpl, `${url}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: 'Call aside_bridge_probe with {"ok":true}. Do not write prose.' }],
      tools: [{ type: 'function', function: {
        name: 'aside_bridge_probe', description: 'Harmless capability verification; no side effects.',
        parameters: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      } }],
      tool_choice: 'required',
    }),
  }, timeoutMs);
  if (!probe.ok) return { ok: false, stage: 'tool-calls', reason: probe.reason ?? `HTTP ${probe.status}` };
  const calls = probe.payload?.choices?.[0]?.message?.tool_calls;
  // Do not count prose, malformed arguments, or extra/unknown calls as proof.
  const call = Array.isArray(calls) && calls.length === 1 ? calls[0] : undefined;
  let parsedArguments;
  try { parsedArguments = JSON.parse(call?.function?.arguments); } catch { /* invalid or absent JSON arguments */ }
  const validArguments = parsedArguments !== null && typeof parsedArguments === 'object' &&
    !Array.isArray(parsedArguments) && parsedArguments.ok === true &&
    Object.keys(parsedArguments).length === 1;
  if (call?.type !== 'function' || call.function?.name !== 'aside_bridge_probe' || !validArguments) {
    return { ok: false, stage: 'tool-calls', reason: 'verified native tool_calls with valid aside_bridge_probe arguments absent' };
  }
  return { ok: true, stage: 'tool-calls', model, type: 'openai-structured-function-call', note: 'Contract probe only, not live Aside browser E2E.' };
}

async function readAsideConfig(filePath) {
  try {
    const info = await lstat(filePath);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error('Refusing non-regular or symlinked models.json');
    const data = JSON.parse(await readFile(filePath, 'utf8'));
    if (!data || Array.isArray(data) || typeof data !== 'object' ||
      !data.providers || Array.isArray(data.providers) || typeof data.providers !== 'object')
      throw new Error('Existing models.json has no valid providers object');
    return data;
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('Aside models.json not found. Start Aside and configure your account first; no new config is created blindly.');
    if (error instanceof SyntaxError) throw new Error('Existing models.json is invalid JSON; refusing to overwrite');
    throw error;
  }
}

export async function applyProvider({ asideDir = DEFAULT_DIR, providerId, model, baseUrl, proxyKey, verification }) {
  if (verification?.ok !== true || verification?.stage !== 'tool-calls')
    throw new Error('Cannot apply: native tool calling has not passed its live bridge probe');
  const fragment = asideFragment({ providerId, model, baseUrl, proxyKey });
  const target = resolve(asideDir, 'models.json');
  const old = await readAsideConfig(target);
  const existing = old.providers[providerId];
  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(fragment))
      return { applied: false, unchanged: true, target };
    throw new Error('Provider ID already exists with different settings; refusing overwrite');
  }
  const updated = { ...old, providers: { ...old.providers, [providerId]: fragment } };
  const backup = `${target}.bak.aside-gemini-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const temporary = `${target}.tmp.${randomUUID()}`;
  await copyFile(target, backup);
  await chmod(backup, 0o600);
  try {
    await writeFile(temporary, `${JSON.stringify(updated, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    JSON.parse(await readFile(temporary, 'utf8'));
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  return { applied: true, target, backup, provider: `${providerId}/${model}`, restartRequired: true };
}

export async function main(args = process.argv.slice(2)) {
  const cfg = { baseUrl: DEFAULT_BASE, providerId: 'gemini-cli-oauth', model: '', asideDir: DEFAULT_DIR, keyEnv: 'CLIPROXYAPI_API_KEY', apply: false, check: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') cfg.apply = true;
    else if (arg === '--check') cfg.check = true;
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: node scripts/setup-aside-gemini.mjs --model MODEL [--base-url http://127.0.0.1:8317/v1] [--provider ID] [--aside-dir PATH] [--key-env ENV_NAME] [--check] [--apply]\nDefault: dry run, no model calls or file writes. --check consumes ONE provider quota request. --apply performs the check, requires native tool_calls, then backs up models.json.\n');
      return 0;
    } else if (['--base-url', '--model', '--provider', '--aside-dir', '--key-env'].includes(arg)) {
      if (!args[i + 1]) throw new Error(`Missing value for ${arg}`);
      cfg[{ '--base-url': 'baseUrl', '--model': 'model', '--provider': 'providerId', '--aside-dir': 'asideDir', '--key-env': 'keyEnv' }[arg]] = args[++i];
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!cfg.model) throw new Error('--model is required: use an exact model ID from your proxy /v1/models');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(cfg.keyEnv)) throw new Error('Invalid API key environment variable name');
  const proxyKey = process.env[cfg.keyEnv];
  const fragment = asideFragment({ ...cfg, proxyKey });
  const redactedFragment = { ...fragment, ...(proxyKey ? { apiKey: '[REDACTED]' } : {}) };
  if (!cfg.check && !cfg.apply) {
    process.stdout.write(`${JSON.stringify({ previewOnly: true, target: resolve(cfg.asideDir, 'models.json'), provider: cfg.providerId, model: cfg.model, apiKeyEnv: cfg.keyEnv, keyConfigured: Boolean(proxyKey), fragment: redactedFragment, warning: 'Not registered or E2E verified; this command performed zero model requests.' }, null, 2)}\n`);
    return 0;
  }
  const verification = await probeProvider({ ...cfg, proxyKey });
  if (!verification.ok) {
    process.stdout.write(`${JSON.stringify({ verification, applied: false }, null, 2)}\n`);
    return 1;
  }
  const result = cfg.apply ? await applyProvider({ ...cfg, proxyKey, verification }) : { applied: false };
  process.stdout.write(`${JSON.stringify({ verification, ...result }, null, 2)}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }, error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
