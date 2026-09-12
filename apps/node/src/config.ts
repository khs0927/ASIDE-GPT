function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

const gatewayUrl = (process.env.ASIDE_GPT_GATEWAY_URL ?? 'http://localhost:8787').replace(/\/$/, '');
const sharedSecret = process.env.ASIDE_GPT_SHARED_SECRET ?? '';
const asideMode = process.env.ASIDE_GPT_ASIDE_MODE ?? 'direct';

if (!sharedSecret) throw new Error('ASIDE_GPT_SHARED_SECRET is required');
if (asideMode !== 'direct' && asideMode !== 'exec') {
  throw new Error('ASIDE_GPT_ASIDE_MODE must be direct or exec');
}

export const config = {
  gatewayUrl,
  sharedSecret,
  nodeId: process.env.ASIDE_GPT_NODE_ID ?? 'primary',
  pollIntervalMs: int('ASIDE_GPT_POLL_INTERVAL_MS', 1_500),
  asideBin: process.env.ASIDE_GPT_ASIDE_BIN ?? 'aside',
  asideTimeoutMs: int('ASIDE_GPT_ASIDE_TIMEOUT_MS', 110_000),
  asideMode: asideMode as 'direct' | 'exec',
};
