import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Actor, Database } from '@kronaut/db';
import {
  convertVideo,
  extractPoster,
  type MediaStore,
  probeVideo,
  storageKey,
  VideoToolError,
  type VideoToolOptions,
} from '@kronaut/media';
import type { Task } from 'graphile-worker';
import type { Logger } from 'pino';
import * as z from 'zod';
import type { MediaJob } from '../jobs.ts';
import { removeIfUnreferenced } from './key-lock.ts';
import {
  finishMedia,
  type ProcessedVideo,
  type RejectedReason,
  rejectMedia,
} from './process-finish.ts';
import type { Staging } from './staging.ts';
import { VIDEO_MAX_BYTES } from './upload.ts';

export interface MediaProcessDeps {
  readonly db: Database;
  readonly store: MediaStore;
  readonly staging: Staging;
  readonly logger: Logger;
  readonly tools?: VideoToolOptions;
}

export type MediaProcessOutcome = 'ready' | 'duplicate' | 'rejected' | 'skipped';

const SYSTEM: Actor = { kind: 'system' };
const MIN_DURATION_MS = 3000;
const MAX_DURATION_MS = 900_000;

const PayloadSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
});

class VideoRejected extends Error {
  readonly reason: RejectedReason;

  constructor(reason: RejectedReason) {
    super(reason);
    this.name = 'VideoRejected';
    this.reason = reason;
  }
}

interface Hashed {
  readonly sha256: Buffer;
  readonly bytes: number;
}

interface Staged {
  readonly key: string;
  readonly live: boolean;
}

async function loadStaged(deps: MediaProcessDeps, job: MediaJob): Promise<Staged | null> {
  const row = await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
    trx
      .selectFrom('media_assets')
      .select(['storage_key', 'kind', 'state', 'deleted_at'])
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', job.id)
      .executeTakeFirst(),
  );
  if (row === undefined || row.kind !== 'video' || row.state !== 'processing') return null;
  return { key: row.storage_key, live: row.deleted_at === null };
}

async function joinParts(staging: Staging, key: string, source: string): Promise<Buffer> {
  const sizes = await staging.parts(key);
  const order = [...sizes.keys()].sort((x, y) => x - y);
  if (order.some((part, index) => part !== index + 1)) {
    throw new Error('the staged parts are not contiguous');
  }
  const dir = staging.directory(key);
  const hash = createHash('sha256');
  async function* concatenated(): AsyncGenerator<Buffer> {
    for (const part of order) {
      for await (const chunk of createReadStream(join(dir, `${part}.part`))) {
        hash.update(chunk as Buffer);
        yield chunk as Buffer;
      }
    }
  }
  await pipeline(concatenated, createWriteStream(source, { mode: 0o640 }));
  return hash.digest();
}

async function hashFile(path: string): Promise<Hashed> {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
    bytes += (chunk as Buffer).byteLength;
  }
  return { sha256: hash.digest(), bytes };
}

// A source ffprobe can't read is bad input; any other tool failure may be the host (OOM, full
// disk, slow CPU), so it is retried and only rejects the video on the job's last attempt.
async function tool<T>(run: () => Promise<T>, final: boolean, source = false): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof VideoToolError) || error.kind === 'missing') throw error;
    if (final || (source && error.kind === 'failed')) throw new VideoRejected('video_unreadable');
    throw error;
  }
}

async function probeSource(source: string, tools: VideoToolOptions | undefined, final: boolean) {
  const probe = await tool(() => probeVideo(source, tools), final, true);
  if (probe.video === null) throw new VideoRejected('video_stream_missing');
  if (probe.durationMs === null) throw new VideoRejected('video_unreadable');
  if (probe.durationMs < MIN_DURATION_MS) throw new VideoRejected('video_too_short');
  if (probe.durationMs > MAX_DURATION_MS) throw new VideoRejected('video_too_long');
  return probe;
}

async function storeVerified(
  store: MediaStore,
  key: string,
  data: Uint8Array | AsyncIterable<Uint8Array>,
  expected: Hashed,
): Promise<void> {
  const stored = await store.put(key, data);
  if (!stored.sha256.equals(expected.sha256) || stored.bytes !== expected.bytes) {
    throw new Error('media store wrote different bytes');
  }
}

async function convert(deps: MediaProcessDeps, job: MediaJob, key: string, final: boolean) {
  const dir = deps.staging.directory(key);
  const source = join(dir, 'source');
  const master = join(dir, 'master.mp4');
  const sourceSha256 = await joinParts(deps.staging, key, source);
  const probe = await probeSource(source, deps.tools, final);
  await tool(() => convertVideo(source, master, probe, deps.tools), final);
  const out = await tool(() => probeVideo(master, deps.tools), final);
  if (out.video === null || out.durationMs === null) throw new VideoRejected('video_unreadable');
  if ((await stat(master)).size > VIDEO_MAX_BYTES) throw new VideoRejected('video_too_large');
  const hashed = await hashFile(master);
  const masterKey = storageKey(job.workspaceId, hashed.sha256);
  await storeVerified(deps.store, masterKey, createReadStream(master), hashed);
  const durationMs = out.durationMs;
  const poster = await tool(() => extractPoster(master, durationMs, deps.tools), final);
  const posterHash = {
    sha256: createHash('sha256').update(poster).digest(),
    bytes: poster.byteLength,
  };
  const posterKey = storageKey(job.workspaceId, posterHash.sha256);
  await storeVerified(deps.store, posterKey, poster, posterHash);
  return {
    key: masterKey,
    sha256: hashed.sha256,
    sourceSha256,
    bytes: hashed.bytes,
    width: out.video.width,
    height: out.video.height,
    durationMs,
    frameRateMilli: toFrameRateMilli(out.video.frameRate),
    poster: { key: posterKey, ...posterHash },
  } satisfies ProcessedVideo;
}

function toFrameRateMilli(rate: number | null): number | null {
  if (rate === null || !Number.isFinite(rate)) return null;
  const milli = Math.round(rate * 1000);
  return milli > 0 ? milli : null;
}

async function settle(
  deps: MediaProcessDeps,
  job: MediaJob,
  key: string,
  final: boolean,
): Promise<{ outcome: MediaProcessOutcome; reason?: RejectedReason | 'video_duplicate' }> {
  try {
    const video = await convert(deps, job, key, final);
    const outcome = await finishMedia(deps.db, deps.store, job, video);
    if (outcome !== 'ready') {
      for (const stored of [video.key, video.poster.key]) {
        await removeIfUnreferenced(deps.db, deps.store, job.workspaceId, stored);
      }
    }
    return outcome === 'duplicate' ? { outcome, reason: 'video_duplicate' } : { outcome };
  } catch (error) {
    if (!(error instanceof VideoRejected)) throw error;
    await rejectMedia(deps.db, job, error.reason);
    return { outcome: 'rejected', reason: error.reason };
  }
}

export async function runMediaProcess(
  deps: MediaProcessDeps,
  job: MediaJob,
  final = true,
): Promise<MediaProcessOutcome> {
  const logger = deps.logger.child({ workspaceId: job.workspaceId, mediaId: job.id });
  const staged = await loadStaged(deps, job);
  if (staged === null || !staged.live) {
    if (staged !== null) await deps.staging.remove(staged.key);
    logger.info({ outcome: 'skipped' }, 'skipped processing an uploaded video');
    return 'skipped';
  }
  const { key } = staged;
  let result: Awaited<ReturnType<typeof settle>>;
  try {
    result = await settle(deps, job, key, final);
  } catch (error) {
    if (error instanceof VideoToolError && error.kind === 'missing') {
      logger.error({ err: error }, 'ffmpeg or ffprobe is missing; the video stays processing');
    }
    throw error;
  }
  await deps.staging.remove(key);
  logger.info(
    { outcome: result.outcome, reason: result.reason ?? null },
    'processed an uploaded video',
  );
  return result.outcome;
}

export function mediaProcessTask(deps: MediaProcessDeps): Task {
  return async (payload, helpers) => {
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      deps.logger.error('media process job payload is invalid');
      return;
    }
    const final = helpers.job.attempts >= helpers.job.max_attempts;
    await runMediaProcess(deps, parsed.data, final);
  };
}
