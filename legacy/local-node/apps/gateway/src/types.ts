export type BrowserTaskAction = 'start' | 'continue';
export type BrowserTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface BrowserTask {
  id: string;
  nodeId: string;
  action: BrowserTaskAction;
  prompt: string;
  sessionId?: string;
  status: BrowserTaskStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  output?: string;
  error?: string;
  resultingSessionId?: string;
}

export interface NodeState {
  nodeId: string;
  lastSeenAt: number;
  version?: string;
  asideVersion?: string;
}

export interface NodeResultPayload {
  ok: boolean;
  output?: string;
  error?: string;
  sessionId?: string;
}
