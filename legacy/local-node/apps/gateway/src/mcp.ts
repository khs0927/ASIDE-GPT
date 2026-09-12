import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import type { TaskBroker } from './task-broker.js';

const nodeIdSchema = z.string().min(1).default('primary').describe('Trusted ASIDE-GPT execution node');

function resultText(task: Awaited<ReturnType<TaskBroker['waitForResult']>>): string {
  if (task.status === 'failed') return `Aside task failed: ${task.error ?? 'unknown error'}`;
  const session = task.resultingSessionId ? `\n\nAside session: ${task.resultingSessionId}` : '';
  return `${task.output ?? 'Task completed with no text output.'}${session}`;
}

export function createAsideMcpHandler(broker: TaskBroker) {
  return createMcpHandler(() => {
    const server = new McpServer(
      { name: 'aside-gpt', version: '0.1.0' },
      {
        instructions:
          'ASIDE-GPT controls a trusted remote browser node from ChatGPT. Prefer browser_read_task for inspection and research. Use browser_run_task only when the user asked to interact with a site. Never request passwords, cookies, passkeys, tokens, or browser profile data. Preserve Aside approval gates for consequential actions.',
      },
    );

    server.registerTool(
      'browser_node_status',
      {
        title: 'Browser Node Status',
        description: 'Check whether the trusted Aside browser execution node is online.',
        inputSchema: z.object({ nodeId: nodeIdSchema }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      async ({ nodeId }) => {
        const node = broker.getNode(nodeId);
        const payload = node ?? { nodeId, online: false };
        return {
          content: [{ type: 'text', text: JSON.stringify(payload) }],
          structuredContent: payload,
        };
      },
    );

    server.registerTool(
      'browser_read_task',
      {
        title: 'Read With Aside Browser',
        description:
          'Use the remote Aside browser for read-only navigation, research, page inspection, extraction, or summarization. It must not submit forms, send messages, buy anything, change settings, or modify remote data.',
        inputSchema: z.object({
          prompt: z.string().min(1).max(20_000),
          nodeId: nodeIdSchema,
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      },
      async ({ prompt, nodeId }) => {
        const guardedPrompt = [
          'READ-ONLY TASK. Navigate and inspect as needed, but do not submit forms, send/post messages, purchase anything, change settings, delete data, upload files, or perform any other mutation.',
          '',
          prompt,
        ].join('\n');
        try {
          const queued = broker.enqueue({ nodeId, action: 'start', prompt: guardedPrompt });
          const result = await broker.waitForResult(queued.id);
          return {
            content: [{ type: 'text', text: resultText(result) }],
            isError: result.status === 'failed',
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
            isError: true,
          };
        }
      },
    );

    server.registerTool(
      'browser_run_task',
      {
        title: 'Run Aside Browser Task',
        description:
          'Run an interactive browser automation task on the trusted Aside node. Use only when the user explicitly wants browser interaction. Aside and ASIDE-GPT approval boundaries must not be bypassed.',
        inputSchema: z.object({
          prompt: z.string().min(1).max(20_000),
          nodeId: nodeIdSchema,
        }),
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
      },
      async ({ prompt, nodeId }) => {
        try {
          const queued = broker.enqueue({ nodeId, action: 'start', prompt });
          const result = await broker.waitForResult(queued.id);
          return {
            content: [{ type: 'text', text: resultText(result) }],
            isError: result.status === 'failed',
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
            isError: true,
          };
        }
      },
    );

    server.registerTool(
      'browser_continue_task',
      {
        title: 'Continue Aside Browser Task',
        description: 'Continue a previously created Aside browser session on the trusted execution node.',
        inputSchema: z.object({
          sessionId: z.string().min(1),
          prompt: z.string().min(1).max(20_000),
          nodeId: nodeIdSchema,
        }),
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
      },
      async ({ sessionId, prompt, nodeId }) => {
        try {
          const queued = broker.enqueue({ nodeId, action: 'continue', prompt, sessionId });
          const result = await broker.waitForResult(queued.id);
          return {
            content: [{ type: 'text', text: resultText(result) }],
            isError: result.status === 'failed',
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
            isError: true,
          };
        }
      },
    );

    return server;
  });
}
