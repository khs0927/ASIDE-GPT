import { randomUUID } from 'node:crypto';
import type { BrowserTask, BrowserTaskAction, NodeResultPayload, NodeState } from './types.js';

export class TaskBroker {
  private readonly tasks = new Map<string, BrowserTask>();
  private readonly nodes = new Map<string, NodeState>();

  constructor(
    private readonly taskTimeoutMs: number,
    private readonly nodeStaleMs: number,
  ) {}

  heartbeat(node: Omit<NodeState, 'lastSeenAt'>): NodeState {
    const state: NodeState = { ...node, lastSeenAt: Date.now() };
    this.nodes.set(node.nodeId, state);
    return state;
  }

  getNode(nodeId: string): (NodeState & { online: boolean }) | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) return undefined;
    return { ...node, online: Date.now() - node.lastSeenAt <= this.nodeStaleMs };
  }

  enqueue(input: {
    nodeId: string;
    action: BrowserTaskAction;
    prompt: string;
    sessionId?: string;
  }): BrowserTask {
    const node = this.getNode(input.nodeId);
    if (!node?.online) throw new Error(`Execution node '${input.nodeId}' is offline`);

    const task: BrowserTask = {
      id: randomUUID(),
      nodeId: input.nodeId,
      action: input.action,
      prompt: input.prompt,
      sessionId: input.sessionId,
      status: 'queued',
      createdAt: Date.now(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  claimNext(nodeId: string): BrowserTask | undefined {
    const task = [...this.tasks.values()].find(
      candidate => candidate.nodeId === nodeId && candidate.status === 'queued',
    );
    if (!task) return undefined;
    task.status = 'running';
    task.startedAt = Date.now();
    return { ...task };
  }

  complete(nodeId: string, taskId: string, result: NodeResultPayload): BrowserTask {
    const task = this.tasks.get(taskId);
    if (!task || task.nodeId !== nodeId) throw new Error('Task not found');
    if (task.status !== 'running') throw new Error(`Task is ${task.status}, not running`);

    task.status = result.ok ? 'succeeded' : 'failed';
    task.output = result.output;
    task.error = result.error;
    task.resultingSessionId = result.sessionId;
    task.finishedAt = Date.now();
    return { ...task };
  }

  async waitForResult(taskId: string): Promise<BrowserTask> {
    const deadline = Date.now() + this.taskTimeoutMs;
    while (Date.now() < deadline) {
      const task = this.tasks.get(taskId);
      if (!task) throw new Error('Task disappeared from broker');
      if (task.status === 'succeeded' || task.status === 'failed') return { ...task };
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    const task = this.tasks.get(taskId);
    if (task && task.status !== 'succeeded' && task.status !== 'failed') {
      task.status = 'failed';
      task.error = 'Gateway timed out waiting for the execution node';
      task.finishedAt = Date.now();
    }
    throw new Error('Browser task timed out');
  }
}
