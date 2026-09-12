import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { TaskLedger, runtimeEventSchema, type RunRecord, type RuntimeEvent } from './index.js';

/** Internal port, NOT an Aside wire protocol. Implement only from a supported vendor contract. */
export interface AsideTaskPort {
  readonly available: boolean;
  submit(request: { tenant: string; runId: string; requestKey: string; instruction: string }, signal: AbortSignal): Promise<unknown>;
  lookup(request: { tenant: string; runId: string; requestKey: string }, signal: AbortSignal): Promise<unknown>;
}
export const unavailableAsidePort: AsideTaskPort = {
  available: false,
  async submit() { throw new Error('official-aside-access-required'); },
  async lookup() { throw new Error('official-aside-access-required'); },
};
const accepted = z.strictObject({ vendorRunId: z.string().min(1).max(200) });
const lookupResult = z.union([accepted, z.null()]);
const instructionSchema = z.string().trim().min(1).max(16000);
type ProviderEvent = Exclude<RuntimeEvent, { type: 'SUBMIT_STARTED' | 'ACCEPTED' | 'TIMEOUT' | 'RECONCILED' | 'DECIDE' }>;

/** Tenant/run key is stable across restart and unambiguous even when IDs contain separators. */
export function requestKey(tenant: string, runId: string): string {
  return createHash('sha256').update(JSON.stringify([tenant, runId])).digest('hex');
}

/** Hosting boundary must authenticate tenants and verify provider messages before calling this service. */
export class TaskDispatcher {
  constructor(
    private readonly ledger: TaskLedger,
    private readonly port: AsideTaskPort = unavailableAsidePort,
    private readonly timeoutMs = 30000,
  ) {
    z.number().int().min(1).max(60000).parse(timeoutMs);
  }

  private requirePort(): void {
    if (!this.port.available) throw new Error('official-aside-access-required');
  }

  private async bounded<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.resolve().then(() => operation(controller.signal)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('Provider response deadline exceeded'));
          }, this.timeoutMs);
        }),
      ]);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }

  async submit(tenant: string, runId: string, instruction: string): Promise<RunRecord> {
    this.requirePort();
    const text = instructionSchema.parse(instruction);
    const current = this.ledger.get(tenant, runId);
    if (current.state !== 'created') throw new Error('Task already dispatched; reconcile instead');
    // Unique event ID + revision CAS, before await: only one worker can claim dispatch.
    this.ledger.append(tenant, runId, randomUUID(), current.revision, { type: 'SUBMIT_STARTED' });
    try {
      const result = accepted.parse(await this.bounded(signal => this.port.submit({
        tenant, runId, requestKey: requestKey(tenant, runId), instruction: text,
      }, signal)));
      const latest = this.ledger.get(tenant, runId);
      if (latest.state === 'dispatching') {
        return this.ledger.append(tenant, runId, randomUUID(), latest.revision, { type: 'ACCEPTED', ...result });
      }
      return latest;
    } catch {
      const latest = this.ledger.get(tenant, runId);
      if (latest.state === 'dispatching') {
        return this.ledger.append(tenant, runId, randomUUID(), latest.revision, { type: 'TIMEOUT' });
      }
      return latest;
    }
  }

  async reconcile(tenant: string, runId: string): Promise<RunRecord> {
    this.requirePort();
    let current = this.ledger.get(tenant, runId);
    if (current.state === 'dispatching') {
      current = this.ledger.append(tenant, runId, randomUUID(), current.revision, { type: 'TIMEOUT' });
    }
    if (current.state !== 'uncertain') throw new Error('Only ambiguous submissions need reconciliation');
    // Lookup is read-only. null means unknown, never permission to resubmit.
    const result = lookupResult.parse(await this.bounded(signal => this.port.lookup({
      tenant, runId, requestKey: requestKey(tenant, runId),
    }, signal)));
    if (result === null) return this.ledger.get(tenant, runId);
    const latest = this.ledger.get(tenant, runId);
    if (latest.state !== 'uncertain') return latest;
    return this.ledger.append(tenant, runId, randomUUID(), latest.revision, { type: 'RECONCILED', ...result });
  }

  /** Adapter verifies authenticity; dispatcher additionally binds every event to the accepted run. */
  ingest(tenant: string, runId: string, vendorRunId: string, eventId: string, revision: number, input: ProviderEvent): RunRecord {
    this.requirePort();
    const event = runtimeEventSchema.parse(input);
    if (['SUBMIT_STARTED', 'ACCEPTED', 'TIMEOUT', 'RECONCILED', 'DECIDE'].includes(event.type)) {
      throw new Error('Provider cannot issue connector or user-decision events');
    }
    const current = this.ledger.get(tenant, runId);
    if (!current.vendorRunId || current.vendorRunId !== vendorRunId) throw new Error('Provider run mismatch');
    return this.ledger.append(tenant, runId, eventId, revision, event);
  }
}
