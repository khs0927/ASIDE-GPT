import { asideVersion, executeAsideTask, type RemoteTask } from './aside.js';
import { config } from './config.js';

const headers = {
  'content-type': 'application/json',
  'x-aside-gpt-secret': config.sharedSecret,
};

let stopped = false;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function heartbeat(version: string | undefined): Promise<void> {
  const response = await fetch(`${config.gatewayUrl}/api/nodes/${encodeURIComponent(config.nodeId)}/heartbeat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ version: '0.1.0', asideVersion: version }),
  });
  if (!response.ok) throw new Error(`heartbeat failed: HTTP ${response.status}`);
}

async function nextTask(): Promise<RemoteTask | undefined> {
  const response = await fetch(`${config.gatewayUrl}/api/nodes/${encodeURIComponent(config.nodeId)}/tasks/next`, {
    method: 'GET',
    headers: { 'x-aside-gpt-secret': config.sharedSecret },
  });
  if (response.status === 204) return undefined;
  if (!response.ok) throw new Error(`task poll failed: HTTP ${response.status}`);
  const body = (await response.json()) as { task?: RemoteTask };
  return body.task;
}

async function report(task: RemoteTask, result: Awaited<ReturnType<typeof executeAsideTask>>): Promise<void> {
  const response = await fetch(
    `${config.gatewayUrl}/api/nodes/${encodeURIComponent(config.nodeId)}/tasks/${encodeURIComponent(task.id)}/result`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(result),
    },
  );
  if (!response.ok) throw new Error(`result upload failed: HTTP ${response.status}`);
}

async function main(): Promise<void> {
  const version = await asideVersion();
  if (!version) {
    throw new Error(`Aside CLI was not found or did not answer: ${config.asideBin}`);
  }

  console.log(`ASIDE-GPT node '${config.nodeId}' starting`);
  console.log(`Aside: ${version}`);
  await heartbeat(version);

  let lastHeartbeat = Date.now();
  while (!stopped) {
    try {
      if (Date.now() - lastHeartbeat > 8_000) {
        await heartbeat(version);
        lastHeartbeat = Date.now();
      }

      const task = await nextTask();
      if (!task) {
        await sleep(config.pollIntervalMs);
        continue;
      }

      console.log(`Running browser task ${task.id} (${task.action})`);
      const result = await executeAsideTask(task);
      await report(task, result);
      console.log(`Finished browser task ${task.id}: ${result.ok ? 'ok' : 'failed'}`);
    } catch (error) {
      console.error(`node loop error: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(Math.max(config.pollIntervalMs, 2_000));
    }
  }
}

process.on('SIGINT', () => {
  stopped = true;
});
process.on('SIGTERM', () => {
  stopped = true;
});

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
