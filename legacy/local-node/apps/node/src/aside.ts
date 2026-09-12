import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

const execFileAsync = promisify(execFile);
const MAX_OUTPUT_CHARS = 250_000;

export interface RemoteTask {
  id: string;
  nodeId: string;
  action: 'start' | 'continue';
  prompt: string;
  sessionId?: string;
}

export interface AsideExecutionResult {
  ok: boolean;
  output?: string;
  error?: string;
  sessionId?: string;
}

function argsFor(task: RemoteTask): string[] {
  const prefix = config.asideMode === 'exec' ? ['exec'] : [];
  if (task.action === 'continue') {
    if (!task.sessionId) throw new Error('continue task requires sessionId');
    return [...prefix, '--session', task.sessionId, task.prompt];
  }
  return [...prefix, task.prompt];
}

function truncate(value: string): string {
  if (value.length <= MAX_OUTPUT_CHARS) return value;
  return `${value.slice(0, MAX_OUTPUT_CHARS)}\n\n[output truncated by ASIDE-GPT]`;
}

function inferSessionId(text: string): string | undefined {
  const patterns = [
    /(?:session(?:\s+id)?|sessionId)\s*[:=]\s*([A-Za-z0-9._-]{6,})/i,
    /--session\s+([A-Za-z0-9._-]{6,})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

export async function asideVersion(): Promise<string | undefined> {
  try {
    const { stdout, stderr } = await execFileAsync(config.asideBin, ['--version'], {
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return `${stdout}${stderr}`.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function executeAsideTask(task: RemoteTask): Promise<AsideExecutionResult> {
  try {
    const { stdout, stderr } = await execFileAsync(config.asideBin, argsFor(task), {
      timeout: config.asideTimeoutMs,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
    });
    const output = truncate(`${stdout}${stderr ? `\n${stderr}` : ''}`.trim());
    return {
      ok: true,
      output,
      sessionId: inferSessionId(output) ?? task.sessionId,
    };
  } catch (error) {
    const candidate = error as Error & { stdout?: string; stderr?: string; code?: string | number };
    const details = truncate([candidate.message, candidate.stdout, candidate.stderr].filter(Boolean).join('\n'));
    return {
      ok: false,
      error: details || 'Aside CLI failed',
      sessionId: task.sessionId,
    };
  }
}
