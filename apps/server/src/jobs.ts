import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';

export const JOBS = {
  publish: 'publish',
  verify: 'verify',
  refreshCredential: 'refresh_credential',
  revokeCredential: 'revoke_credential',
  mediaProcess: 'media_process',
  metaLifecycle: 'meta_lifecycle',
} as const;

export type JobName = (typeof JOBS)[keyof typeof JOBS];

export interface DestinationJob {
  readonly workspaceId: string;
  readonly id: string;
}

export interface CredentialJob {
  readonly workspaceId: string;
  readonly id: string;
}

export interface RevokeJob {
  readonly workspaceId: string;
  readonly id: string;
  readonly version: number;
}

export interface MediaJob {
  readonly workspaceId: string;
  readonly id: string;
}

export const REVOKE_ATTEMPTS = 8;
export const MEDIA_PROCESS_ATTEMPTS = 3;
export const META_LIFECYCLE_ATTEMPTS = 8;

export async function enqueueRevoke(trx: TenantDb, credential: RevokeJob): Promise<void> {
  const payload = JSON.stringify(credential);
  await sql`
    select graphile_worker.add_job(${JOBS.revokeCredential}, ${payload}::json,
      max_attempts := ${REVOKE_ATTEMPTS},
      job_key := ${`revoke:${credential.id}`},
      job_key_mode := 'replace')
  `.execute(trx);
}

export function destinationJobKey(destinationId: string): string {
  return `dest:${destinationId}`;
}

// Retries belong to the destination state machine and the due sweep, never to the queue.
export async function enqueuePublish(
  trx: TenantDb,
  destination: DestinationJob,
  runAt: Temporal.Instant,
): Promise<void> {
  const payload = JSON.stringify({ workspaceId: destination.workspaceId, id: destination.id });
  await sql`
    select graphile_worker.add_job(${JOBS.publish}, ${payload}::json,
      run_at := ${runAt.toString()}::timestamptz,
      max_attempts := 1,
      job_key := ${destinationJobKey(destination.id)},
      job_key_mode := 'replace')
  `.execute(trx);
}

export async function ensurePublishJob(trx: TenantDb, destination: DestinationJob): Promise<void> {
  const payload = JSON.stringify({ workspaceId: destination.workspaceId, id: destination.id });
  await sql`
    select graphile_worker.add_job(${JOBS.publish}, ${payload}::json,
      run_at := now(),
      max_attempts := 1,
      job_key := ${destinationJobKey(destination.id)},
      job_key_mode := 'preserve_run_at')
  `.execute(trx);
}

export async function dequeuePublish(trx: TenantDb, destinationId: string): Promise<void> {
  await sql`select graphile_worker.remove_job(${destinationJobKey(destinationId)})`.execute(trx);
}

export function verifyJobKey(destinationId: string): string {
  return `verify:${destinationId}`;
}

async function addVerifyJob(
  trx: TenantDb,
  destination: DestinationJob,
  runAt: Temporal.Instant,
  mode: 'replace' | 'preserve_run_at',
): Promise<void> {
  const payload = JSON.stringify({ workspaceId: destination.workspaceId, id: destination.id });
  await sql`
    select graphile_worker.add_job(${JOBS.verify}, ${payload}::json,
      run_at := ${runAt.toString()}::timestamptz,
      max_attempts := 1,
      job_key := ${verifyJobKey(destination.id)},
      job_key_mode := ${mode})
  `.execute(trx);
}

export function enqueueVerify(
  trx: TenantDb,
  destination: DestinationJob,
  runAt: Temporal.Instant,
): Promise<void> {
  return addVerifyJob(trx, destination, runAt, 'replace');
}

export function ensureVerifyJob(
  trx: TenantDb,
  destination: DestinationJob,
  runAt: Temporal.Instant,
): Promise<void> {
  return addVerifyJob(trx, destination, runAt, 'preserve_run_at');
}

export async function enqueueMediaProcess(trx: TenantDb, job: MediaJob): Promise<void> {
  const payload = JSON.stringify({ workspaceId: job.workspaceId, id: job.id });
  await sql`
    select graphile_worker.add_job(${JOBS.mediaProcess}, ${payload}::json,
      queue_name := 'media',
      max_attempts := ${MEDIA_PROCESS_ATTEMPTS},
      job_key := ${`media:${job.id}`},
      job_key_mode := 'preserve_run_at')
  `.execute(trx);
}

export async function enqueueMetaLifecycle(trx: TenantDb, requestId: string): Promise<void> {
  const payload = JSON.stringify({ requestId });
  await sql`
    select graphile_worker.add_job(${JOBS.metaLifecycle}, ${payload}::json,
      max_attempts := ${META_LIFECYCLE_ATTEMPTS},
      job_key := ${`meta:${requestId}`},
      job_key_mode := 'preserve_run_at')
  `.execute(trx);
}
