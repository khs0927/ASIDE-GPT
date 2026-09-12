function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export const config = {
  port: int('PORT', 8787),
  sharedSecret: process.env.ASIDE_GPT_SHARED_SECRET ?? '',
  taskTimeoutMs: int('ASIDE_GPT_TASK_TIMEOUT_MS', 120_000),
  nodeStaleMs: int('ASIDE_GPT_NODE_STALE_MS', 15_000),
};

if (!config.sharedSecret) {
  throw new Error('ASIDE_GPT_SHARED_SECRET is required');
}
