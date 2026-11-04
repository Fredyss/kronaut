import {
  type Client,
  type MediaGetResponse,
  type MediaVideoUploadResponse,
  mediaGet,
  mediaVideoComplete,
  mediaVideoPart,
  mediaVideoUpload,
} from '@kronaut/sdk';
import { type Wait, withRetry } from '../../../base/api/retry.ts';

export type VideoAsset = Omit<MediaGetResponse, 'previewUrl'>;
export type RejectedReason = NonNullable<VideoAsset['rejectedReason']>;

const POLL_MS = 3000;

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

export function partRanges(bytes: number, partSize: number, partCount: number) {
  return Array.from({ length: partCount }, (_, index) => ({
    start: index * partSize,
    end: Math.min(bytes, (index + 1) * partSize),
  }));
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
