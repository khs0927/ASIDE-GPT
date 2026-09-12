import { timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { config } from './config.js';
import { createAsideMcpHandler } from './mcp.js';
import { TaskBroker } from './task-broker.js';
import type { NodeResultPayload } from './types.js';

const app = express();
const broker = new TaskBroker(config.taskTimeoutMs, config.nodeStaleMs);
const mcp = toNodeHandler(createAsideMcpHandler(broker));

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

function secretMatches(candidate: string | undefined): boolean {
  if (!candidate) return false;
  const expected = Buffer.from(config.sharedSecret);
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function requireBearer(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!secretMatches(token)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

function requireNodeSecret(req: Request, res: Response, next: NextFunction): void {
  if (!secretMatches(req.header('x-aside-gpt-secret') ?? undefined)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'aside-gpt-gateway', version: '0.1.0' });
});

app.post('/api/nodes/:nodeId/heartbeat', requireNodeSecret, (req, res) => {
  const node = broker.heartbeat({
    nodeId: req.params.nodeId,
    version: typeof req.body?.version === 'string' ? req.body.version : undefined,
    asideVersion: typeof req.body?.asideVersion === 'string' ? req.body.asideVersion : undefined,
  });
  res.json({ ok: true, node });
});

app.get('/api/nodes/:nodeId/tasks/next', requireNodeSecret, (req, res) => {
  broker.heartbeat({ nodeId: req.params.nodeId });
  const task = broker.claimNext(req.params.nodeId);
  if (!task) {
    res.status(204).end();
    return;
  }
  res.json({ task });
});

app.post('/api/nodes/:nodeId/tasks/:taskId/result', requireNodeSecret, (req, res) => {
  const payload = req.body as NodeResultPayload;
  if (typeof payload?.ok !== 'boolean') {
    res.status(400).json({ error: 'body.ok must be boolean' });
    return;
  }
  try {
    const task = broker.complete(req.params.nodeId, req.params.taskId, payload);
    res.json({ ok: true, task });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.all('/mcp', requireBearer, (req, res) => {
  void mcp(req, res, req.body);
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`ASIDE-GPT gateway listening on :${config.port}`);
  console.log(`MCP endpoint: /mcp`);
});
