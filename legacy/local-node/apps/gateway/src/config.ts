function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export const config = {
  port: int('PORT', 8787),
  mcpToken: process.env.ASIDE_GPT_MCP_TOKEN ?? '',
  nodeSecret: process.env.ASIDE_GPT_NODE_SECRET ?? '',
  taskTimeoutMs: int('ASIDE_GPT_TASK_TIMEOUT_MS', 120_000),
  nodeStaleMs: int('ASIDE_GPT_NODE_STALE_MS', 15_000),
};

if (!config.mcpToken) throw new Error('ASIDE_GPT_MCP_TOKEN is required');
if (!config.nodeSecret) throw new Error('ASIDE_GPT_NODE_SECRET is required');
if (config.mcpToken === config.nodeSecret) {
  throw new Error('ASIDE_GPT_MCP_TOKEN and ASIDE_GPT_NODE_SECRET must be different');
}
