import {
  type MediaGetResponse,
  type MediaImportCreateResponse,
  mediaGet,
  mediaImportCreate,
  mediaImportGet,
} from '@kronaut/sdk';
import { errorStatus } from '../../base/api/errors.ts';
import { type VideoApi, withRetry } from '../../composer/compose/media/video-upload.ts';

const POLL_MS = 2000;
const TOO_MANY_REQUESTS = 429;

type Asset = Pick<
  MediaGetResponse,
  'id' | 'kind' | 'mime' | 'bytes' | 'state' | 'rejectedReason' | 'duplicateOf'
>;

export type FetchedAsset = Pick<Asset, 'id' | 'kind' | 'mime' | 'bytes'>;

export type MediaResult =
  | { readonly kind: 'ready'; readonly asset: FetchedAsset }
  | { readonly kind: 'failed' }
  | { readonly kind: 'rejected' };

export interface RateLimited {
  readonly kind: 'media_rate_limited';
}

export const RATE_LIMITED: RateLimited = { kind: 'media_rate_limited' };

export type LinkOutcome = MediaResult | RateLimited;

const FAILED: MediaResult = { kind: 'failed' };
const REJECTED: MediaResult = { kind: 'rejected' };

async function startImport(api: VideoApi, url: string, key: string, signal: AbortSignal) {
  const path = { workspaceId: api.workspaceId };
  const headers = { 'Idempotency-Key': key };
  const create = () =>
    mediaImportCreate({ client: api.client, path, body: { url }, headers, signal });
  try {
    return (await withRetry(api, signal, create)).data;
  } catch (error) {
    if (errorStatus(error) === TOO_MANY_REQUESTS) return null;
    throw error;
  }
}

async function getImport(api: VideoApi, importId: string, signal: AbortSignal) {
  const path = { workspaceId: api.workspaceId, importId };
  return (await mediaImportGet({ client: api.client, path, signal })).data;
}

async function getAsset(api: VideoApi, mediaId: string, signal: AbortSignal): Promise<Asset> {
  const path = { workspaceId: api.workspaceId, mediaId };
  return (await mediaGet({ client: api.client, path, signal })).data;
}

async function settled(api: VideoApi, first: Asset, signal: AbortSignal): Promise<Asset> {
  let asset = first;
  while (asset.state !== 'ready' && asset.state !== 'rejected') {
    await api.wait(POLL_MS, signal);
    asset = await withRetry(api, signal, () => getAsset(api, first.id, signal));
  }
  return asset;
}

async function importedAsset(api: VideoApi, first: MediaImportCreateResponse, signal: AbortSignal) {
  let job = first;
  while (job.state === 'pending' || job.state === 'fetching') {
    await api.wait(POLL_MS, signal);
    const { id } = job;
    job = await withRetry(api, signal, () => getImport(api, id, signal));
  }
  return job.state === 'done' ? job.media : null;
}

function ready({ id, kind, mime, bytes }: Asset): MediaResult {
  return { kind: 'ready', asset: { id, kind, mime, bytes } };
}

async function usable(api: VideoApi, imported: Asset, signal: AbortSignal): Promise<MediaResult> {
  const asset = await settled(api, imported, signal);
  if (asset.state === 'ready') return ready(asset);
  if (asset.rejectedReason !== 'video_duplicate' || asset.duplicateOf === null) return REJECTED;
  const keptId = asset.duplicateOf;
  const first = await withRetry(api, signal, () => getAsset(api, keptId, signal));
  const kept = await settled(api, first, signal);
  return kept.state === 'ready' ? ready(kept) : REJECTED;
}

export async function fetchLink(
  api: VideoApi,
  url: string,
  key: string,
  signal: AbortSignal,
): Promise<LinkOutcome> {
  try {
    const started = await startImport(api, url, key, signal);
    if (started === null) return RATE_LIMITED;
    const imported = await importedAsset(api, started, signal);
    return imported === null ? FAILED : await usable(api, imported, signal);
  } catch {
    signal.throwIfAborted();
    return FAILED;
  }
}

export interface FetchProgress {
  readonly current: number;
  readonly total: number;
}

export interface FetchRun {
  readonly api: VideoApi;
  readonly urls: readonly string[];
  readonly keys: Map<string, string>;
  readonly store: Map<string, MediaResult>;
  readonly signal: AbortSignal;
}

export async function fetchAll(
  run: FetchRun,
  onStep: (progress: FetchProgress | null) => void,
): Promise<boolean> {
  const total = run.urls.length;
  onStep({ current: 1, total });
  for (const [index, url] of run.urls.entries()) {
    const key = run.keys.get(url) ?? crypto.randomUUID();
    run.keys.set(url, key);
    let outcome: LinkOutcome;
    try {
      outcome = await fetchLink(run.api, url, key, run.signal);
    } catch {
      return false;
    }
    if (outcome.kind === 'media_rate_limited') return true;
    run.store.set(url, outcome);
    onStep(index + 1 === total ? null : { current: index + 2, total });
  }
  return false;
}
