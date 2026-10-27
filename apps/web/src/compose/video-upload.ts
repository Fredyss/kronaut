import {
  type Client,
  type MediaGetResponse,
  type MediaVideoUploadResponse,
  mediaGet,
  mediaVideoComplete,
  mediaVideoPart,
  mediaVideoUpload,
} from '@kronaut/sdk';
import { errorStatus } from '../api.ts';

export type VideoAsset = MediaGetResponse;
export type RejectedReason = NonNullable<VideoAsset['rejectedReason']>;

const POLL_MS = 3000;
const BACKOFF_MS: readonly number[] = [1000, 2000, 4000];

export type Wait = (ms: number, signal: AbortSignal) => Promise<void>;

export interface VideoApi {
  readonly client: Client;
  readonly workspaceId: string;
  readonly wait: Wait;
}

export interface VideoJob {
  readonly file: File;
  readonly aiGenerated: () => boolean;
  readonly signal: AbortSignal;
  readonly onCreated: (asset: VideoAsset) => void;
  readonly onProgress: (sent: number, total: number) => void;
  readonly onProcessing: () => void;
}

export type VideoOutcome =
  | { readonly kind: 'ready'; readonly asset: VideoAsset }
  | { readonly kind: 'rejected'; readonly reason: RejectedReason };

export const sleep: Wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

export function partRanges(bytes: number, partSize: number, partCount: number) {
  return Array.from({ length: partCount }, (_, index) => ({
    start: index * partSize,
    end: Math.min(bytes, (index + 1) * partSize),
  }));
}

function retryable(error: unknown): boolean {
  const status = errorStatus(error);
  return status === null || status === 0 || status >= 500;
}

async function withRetry<T>(api: VideoApi, signal: AbortSignal, call: () => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      signal.throwIfAborted();
      const delay = BACKOFF_MS[attempt];
      if (delay === undefined || !retryable(error)) throw error;
      await api.wait(delay, signal);
    }
  }
}

async function create(api: VideoApi, job: VideoJob): Promise<MediaVideoUploadResponse> {
  const { file, signal } = job;
  const { data } = await mediaVideoUpload({
    client: api.client,
    path: { workspaceId: api.workspaceId },
    body: {
      kind: 'video',
      bytes: file.size,
      mime: file.type,
      ...(file.name === '' ? {} : { filename: file.name.slice(0, 255) }),
      ...(job.aiGenerated() ? { aiGenerated: true } : {}),
    },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    signal,
  });
  return data;
}

async function sendParts(api: VideoApi, job: VideoJob, upload: MediaVideoUploadResponse) {
  const { file, signal } = job;
  const path = { workspaceId: api.workspaceId, mediaId: upload.media.id };
  job.onProgress(0, file.size);
  const ranges = partRanges(file.size, upload.partSize, upload.partCount);
  for (const [index, { start, end }] of ranges.entries()) {
    signal.throwIfAborted();
    const body = file.slice(start, end);
    const part = { ...path, part: String(index + 1) };
    await withRetry(api, signal, () =>
      mediaVideoPart({ client: api.client, path: part, body, signal }),
    );
    job.onProgress(end, file.size);
  }
}

async function fetchAsset(api: VideoApi, mediaId: string, signal: AbortSignal) {
  const path = { workspaceId: api.workspaceId, mediaId };
  return (await mediaGet({ client: api.client, path, signal })).data;
}

async function settle(api: VideoApi, signal: AbortSignal, first: VideoAsset) {
  let asset = first;
  const { id } = first;
  while (asset.state !== 'ready' && asset.state !== 'rejected') {
    await api.wait(POLL_MS, signal);
    asset = await withRetry(api, signal, () => fetchAsset(api, id, signal));
  }
  return asset;
}

export async function uploadVideo(api: VideoApi, job: VideoJob): Promise<VideoOutcome> {
  const { signal } = job;
  const upload = await create(api, job);
  job.onCreated(upload.media);
  await sendParts(api, job, upload);
  job.onProcessing();
  const { data } = await mediaVideoComplete({
    client: api.client,
    path: { workspaceId: api.workspaceId, mediaId: upload.media.id },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    signal,
  });
  const asset = await settle(api, signal, data);
  if (asset.state === 'ready') return { kind: 'ready', asset };
  if (asset.rejectedReason === 'video_duplicate' && asset.duplicateOf !== null) {
    return { kind: 'ready', asset: await fetchAsset(api, asset.duplicateOf, signal) };
  }
  return { kind: 'rejected', reason: asset.rejectedReason ?? 'video_unreadable' };
}
