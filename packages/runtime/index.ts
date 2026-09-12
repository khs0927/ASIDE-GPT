import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createMachine, transition } from 'xstate';
import { z } from 'zod';

// Internal connector contract. These are NOT documented Aside API fields.
const id = z.string().min(1).max(200);
const time = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const httpsUrl = z.string().url().max(4096).refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
});
const approval = z.strictObject({ id, actionDigest: digest, expiresAt: time });
const evidence = z.strictObject({
  provider: z.literal('aside'), vendorRunId: id, finalUrl: httpsUrl,
  title: z.string().max(1000), observedAt: time,
});
export const runtimeEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('SUBMIT_STARTED') }),
  z.strictObject({ type: z.literal('ACCEPTED'), vendorRunId: id }),
  z.strictObject({ type: z.literal('TIMEOUT') }),
  z.strictObject({ type: z.literal('RECONCILED'), vendorRunId: id }),
  z.strictObject({ type: z.literal('APPROVAL_REQUIRED'), approval }),
  z.strictObject({ type: z.literal('DECIDE'), approvalId: id, actionDigest: digest, approved: z.boolean() }),
  z.strictObject({ type: z.literal('RESUMED') }),
  z.strictObject({ type: z.literal('SIGNIN_REQUIRED') }),
  z.strictObject({ type: z.literal('COMPLETE'), evidence }),
  z.strictObject({ type: z.literal('FAILED') }),
  z.strictObject({ type: z.literal('CANCEL_CONFIRMED') }),
]);
export type RuntimeEvent = z.infer<typeof runtimeEventSchema>;
export type RunState = 'created' | 'dispatching' | 'uncertain' | 'running' |
  'waiting_approval' | 'approval_decided' | 'waiting_signin' | 'completed' | 'failed' | 'cancelled';
export interface RunRecord {
  tenant: string; runId: string; revision: number; state: RunState;
  vendorRunId?: string;
  approval?: z.infer<typeof approval>;
  approved?: boolean;
  evidence?: z.infer<typeof evidence>;
}
const terminal = { FAILED: 'failed', CANCEL_CONFIRMED: 'cancelled' };
const machine = createMachine({
  id: 'aside-connector', initial: 'created',
  states: {
    created: { on: { SUBMIT_STARTED: 'dispatching' } },
    dispatching: { on: { ACCEPTED: 'running', TIMEOUT: 'uncertain', ...terminal } },
    uncertain: { on: { RECONCILED: 'running', ...terminal } },
    running: { on: { APPROVAL_REQUIRED: 'waiting_approval', SIGNIN_REQUIRED: 'waiting_signin', COMPLETE: 'completed', ...terminal } },
    waiting_approval: { on: { DECIDE: 'approval_decided', ...terminal } },
    approval_decided: { on: { RESUMED: 'running', ...terminal } },
    waiting_signin: { on: { RESUMED: 'running', ...terminal } },
    completed: { type: 'final' }, failed: { type: 'final' }, cancelled: { type: 'final' },
  },
});

/** Hash the exact canonical action supplied by a trusted adapter, never page instructions. */
export function actionDigest(canonicalAction: string): string {
  return createHash('sha256').update(canonicalAction).digest('hex');
}

/** Internal persistence boundary; the hosting service MUST authenticate principals and provider events. */
export class TaskLedger {
  private readonly db: DatabaseSync;
  constructor(path: string, private readonly clock: () => number = Date.now) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS runs(tenant TEXT, run_id TEXT, record TEXT NOT NULL, PRIMARY KEY(tenant,run_id));
      CREATE TABLE IF NOT EXISTS events(tenant TEXT, run_id TEXT, event_id TEXT, payload TEXT NOT NULL, PRIMARY KEY(tenant,run_id,event_id));`);
  }
  close(): void { this.db.close(); }
  create(tenant: string, runId: string): RunRecord {
    id.parse(tenant); id.parse(runId);
    const record: RunRecord = { tenant, runId, revision: 0, state: 'created' };
    this.db.prepare('INSERT INTO runs VALUES(?,?,?)').run(tenant, runId, JSON.stringify(record));
    return record;
  }
  get(tenant: string, runId: string): RunRecord {
    id.parse(tenant); id.parse(runId);
    const row = this.db.prepare('SELECT record FROM runs WHERE tenant=? AND run_id=?').get(tenant, runId);
    if (!row) throw new Error('Run not found');
    return JSON.parse(String(row.record)) as RunRecord;
  }
  append(tenant: string, runId: string, eventId: string, expectedRevision: number, input: unknown): RunRecord {
    id.parse(eventId); time.parse(expectedRevision);
    const event = runtimeEventSchema.parse(input);
    const payload = JSON.stringify(event);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.get(tenant, runId);
      const duplicate = this.db.prepare('SELECT payload FROM events WHERE tenant=? AND run_id=? AND event_id=?').get(tenant, runId, eventId);
      if (duplicate) {
        if (duplicate.payload !== payload) throw new Error('Event ID reused with different payload');
        this.db.exec('COMMIT');
        return current;
      }
      if (current.revision !== expectedRevision) throw new Error('Revision conflict');
      const snapshot = machine.resolveState({ value: current.state, context: {} });
      const [next] = transition(machine, snapshot, event);
      if (next.value === current.state) throw new Error('Invalid transition');
      const record: RunRecord = { ...current, revision: current.revision + 1, state: next.value as RunState };
      const now = time.parse(this.clock());
      if (event.type === 'ACCEPTED' || event.type === 'RECONCILED') record.vendorRunId = event.vendorRunId;
      if (event.type === 'APPROVAL_REQUIRED') {
        if (event.approval.expiresAt <= now) throw new Error('Approval expired');
        record.approval = event.approval;
        delete record.approved;
      }
      if (event.type === 'DECIDE') {
        if (!current.approval || current.approval.id !== event.approvalId ||
          current.approval.actionDigest !== event.actionDigest || current.approval.expiresAt <= now)
          throw new Error('Approval mismatch or expired');
        record.approved = event.approved;
      }
      if (event.type === 'RESUMED' && current.state === 'approval_decided') {
        if (!current.approved || !current.approval || current.approval.expiresAt <= now)
          throw new Error('No valid approval');
        delete record.approval; delete record.approved;
      }
      if (event.type === 'COMPLETE') {
        if (event.evidence.vendorRunId !== current.vendorRunId || event.evidence.observedAt > now)
          throw new Error('Evidence does not match run or time');
        record.evidence = event.evidence;
      }
      this.db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(tenant, runId, eventId, payload);
      this.db.prepare('UPDATE runs SET record=? WHERE tenant=? AND run_id=?').run(JSON.stringify(record), tenant, runId);
      this.db.exec('COMMIT');
      return record;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
