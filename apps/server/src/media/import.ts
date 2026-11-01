import type { Database } from '@kronaut/db';
import type { EgressPolicy, EgressResponse, HttpClient } from '@kronaut/egress';
import type { MediaStore } from '@kronaut/media';
import type { Task } from 'graphile-worker';
import type { Logger } from 'pino';
import * as z from 'zod';
import type { MediaJob } from '../jobs/jobs.ts';
import { badStatus, classifyImportFailure, refuseImport } from './import-failure.ts';
import { exactParts } from './import-parts.ts';
import { type ClaimedImport, claimImport, failImport, markImportDone } from './import-store.ts';
import { importVideo } from './import-video.ts';
import { ingestImage, prepareImage } from './ingest.ts';
import { internalId } from './routes.ts';
import { detectImageFormat } from './sniff.ts';
import { isMp4, isWebm, MP4_MIME, WEBM_MIME } from './sniff-mp4.ts';
import type { Staging } from './staging.ts';
import { VIDEO_MAX_BYTES, VIDEO_PART_SIZE } from './upload.ts';

export const MEDIA_IMPORT_EGRESS: EgressPolicy = {
  allowedHosts: 'any',
  maxResponseBytes: VIDEO_MAX_BYTES,
  timeoutMs: 600_000,
  maxRedirects: 5,
};

const REQUEST_HEADERS = { 'user-agent': 'Kronaut media import', accept: 'image/*,video/*' };
const NO_BYTES = new Uint8Array();

const PayloadSchema = z.object({ workspaceId: z.uuid(), id: z.uuid() });

export interface MediaImportDeps {
  readonly db: Database;
  readonly store: MediaStore;
  readonly staging: Staging;
  readonly http: HttpClient;
  readonly logger: Logger;
}

export type MediaImportOutcome = 'done' | 'failed' | 'skipped';

function videoMime(head: Uint8Array): string | null {
  if (isMp4(head)) return MP4_MIME;
  return isWebm(head) ? WEBM_MIME : null;
}

async function importImage(
  deps: MediaImportDeps,
  job: MediaJob,
  claim: ClaimedImport,
  bytes: Uint8Array,
): Promise<void> {
  const prepared = await prepareImage({ bytes });
  await deps.db.withTenant(job.workspaceId, claim.actor, async (trx) => {
    const target = { workspaceId: job.workspaceId, aiGenerated: claim.aiGenerated };
    const asset = await ingestImage(trx, deps.store, target, prepared);
    await markImportDone(trx, job, internalId('media', asset.id));
  });
}

async function storeBody(
  deps: MediaImportDeps,
  job: MediaJob,
  claim: ClaimedImport,
  response: EgressResponse,
): Promise<void> {
  const parts = exactParts(response.chunks(), VIDEO_PART_SIZE);
  const first = await parts.next();
  const head = first.done === true ? NO_BYTES : first.value;
  const second = await parts.next();
  if (detectImageFormat(head) !== null) {
    if (second.done !== true) throw refuseImport('file_too_large');
    await importImage(deps, job, claim, head);
    return;
  }
  const mime = videoMime(head);
  if (mime === null) throw refuseImport('unsupported_type');
  async function* all(): AsyncGenerator<Uint8Array> {
    yield head;
    for (let next = second; next.done !== true; next = await parts.next()) yield next.value;
  }
  await importVideo(deps, job, {
    actor: claim.actor,
    aiGenerated: claim.aiGenerated,
    mime,
    headBytes: head.byteLength,
    parts: all(),
  });
}

async function download(
  deps: MediaImportDeps,
  job: MediaJob,
  signal: AbortSignal | undefined,
): Promise<MediaImportOutcome> {
  const claim = await claimImport(deps.db, job);
  if (claim === null) return 'skipped';
  const response = await deps.http.request(claim.url, {
    headers: REQUEST_HEADERS,
    ...(signal === undefined ? {} : { signal }),
  });
  try {
    if (response.status !== 200) throw badStatus(response.status);
    await storeBody(deps, job, claim, response);
    return 'done';
  } finally {
    response.discard();
  }
}

// Whatever is thrown here lands in graphile's last_error and logs, and undici errors can hold the
// URL, so only the failure kind ever leaves this function.
export async function runMediaImport(
  deps: MediaImportDeps,
  job: MediaJob,
  final = true,
  signal?: AbortSignal,
): Promise<MediaImportOutcome> {
  try {
    return await download(deps, job, signal);
  } catch (error) {
    const { kind, retryable } = classifyImportFailure(error);
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    deps.logger.warn(
      { importId: job.id, workspaceId: job.workspaceId, kind, code },
      'media import failed',
    );
    if (retryable && !final) throw new Error(kind);
    try {
      await failImport(deps.db, job, kind);
    } catch {
      throw new Error(kind);
    }
    return 'failed';
  }
}

export function mediaImportTask(deps: MediaImportDeps): Task {
  return async (payload, helpers) => {
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      deps.logger.error('media import job payload is invalid');
      return;
    }
    const final = helpers.job.attempts >= helpers.job.max_attempts;
    await runMediaImport(deps, parsed.data, final, helpers.abortSignal);
  };
}
