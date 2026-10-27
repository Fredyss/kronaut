import { type Client, mediaMarkAi } from '@kronaut/sdk';
import { useEffect, useState } from 'react';
import { useApiClient } from '../context.ts';
import { type RejectedReason, sleep, uploadVideo, type VideoAsset } from './video-upload.ts';

export type VideoPhase =
  | { readonly kind: 'uploading'; readonly sent: number; readonly total: number }
  | { readonly kind: 'processing' }
  | { readonly kind: 'ready'; readonly asset: VideoAsset }
  | { readonly kind: 'rejected'; readonly reason: RejectedReason }
  | { readonly kind: 'error' };

export interface VideoEntry {
  readonly file: File;
  readonly url: string;
  readonly aiGenerated: boolean;
  readonly phase: VideoPhase;
}

export type VideoRegistry = ReadonlyMap<string, VideoEntry>;

interface Slot {
  readonly controller: AbortController;
  readonly url: string;
  ai: boolean;
  mediaId: string | null;
  marking: string | null;
}

type Patch = (id: string, change: (entry: VideoEntry) => VideoEntry) => void;

interface Uploads {
  readonly client: Client;
  readonly workspaceId: string;
  readonly slots: Map<string, Slot>;
  readonly patch: Patch;
}

function withPhase(phase: VideoPhase) {
  return (entry: VideoEntry): VideoEntry => ({ ...entry, phase });
}

function markAi(u: Uploads, id: string, slot: Slot) {
  const { mediaId } = slot;
  if (!slot.ai || mediaId === null || slot.marking === mediaId) return;
  slot.marking = mediaId;
  mediaMarkAi({
    client: u.client,
    path: { workspaceId: u.workspaceId, mediaId },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    signal: slot.controller.signal,
  }).then(
    ({ data }) =>
      u.patch(id, (entry) =>
        entry.phase.kind === 'ready' && entry.phase.asset.id === data.id
          ? withPhase({ kind: 'ready', asset: data })(entry)
          : entry,
      ),
    () => {
      slot.marking = null;
    },
  );
}

function start(u: Uploads, id: string, file: File, slot: Slot) {
  u.slots.set(id, slot);
  const { signal } = slot.controller;
  const adopt = (asset: VideoAsset) => {
    slot.mediaId = asset.id;
    if (asset.aiGenerated) slot.marking = asset.id;
    markAi(u, id, slot);
  };
  uploadVideo(
    { client: u.client, workspaceId: u.workspaceId, wait: sleep },
    {
      file,
      signal,
      aiGenerated: () => slot.ai,
      onCreated: adopt,
      onProgress: (sent, total) => u.patch(id, withPhase({ kind: 'uploading', sent, total })),
      onProcessing: () => u.patch(id, withPhase({ kind: 'processing' })),
    },
  ).then(
    (outcome) => {
      u.patch(id, withPhase(outcome));
      if (outcome.kind === 'ready') adopt(outcome.asset);
    },
    () => {
      if (!signal.aborted) u.patch(id, withPhase({ kind: 'error' }));
    },
  );
}

function newSlot(url: string, ai: boolean): Slot {
  return { controller: new AbortController(), url, ai, mediaId: null, marking: null };
}

export function useVideos(workspaceId: string, inUse: readonly string[]) {
  const client = useApiClient();
  const [entries, setEntries] = useState<VideoRegistry>(new Map());
  const [slots] = useState(() => new Map<string, Slot>());
  const patch: Patch = (id, change) =>
    setEntries((current) => {
      const entry = current.get(id);
      return entry === undefined ? current : new Map(current).set(id, change(entry));
    });
  const u: Uploads = { client, workspaceId, slots, patch };
  const used = inUse.join(' ');

  useEffect(() => {
    const keep = new Set(used.split(' '));
    const stale = [...slots.keys()].filter((id) => !keep.has(id));
    if (stale.length === 0) return;
    for (const id of stale) {
      const slot = slots.get(id);
      slot?.controller.abort();
      if (slot !== undefined) URL.revokeObjectURL(slot.url);
      slots.delete(id);
    }
    setEntries((current) => new Map([...current].filter(([id]) => keep.has(id))));
  }, [used, slots]);

  useEffect(
    () => () => {
      for (const slot of slots.values()) {
        slot.controller.abort();
        URL.revokeObjectURL(slot.url);
      }
      slots.clear();
    },
    [slots],
  );

  const add = (file: File): string => {
    const id = crypto.randomUUID();
    const slot = newSlot(URL.createObjectURL(file), false);
    const phase: VideoPhase = { kind: 'uploading', sent: 0, total: file.size };
    setEntries((current) =>
      new Map(current).set(id, { file, url: slot.url, aiGenerated: false, phase }),
    );
    start(u, id, file, slot);
    return id;
  };
  const retry = (id: string) => {
    const entry = entries.get(id);
    const old = slots.get(id);
    if (entry === undefined || old === undefined) return;
    old.controller.abort();
    patch(id, withPhase({ kind: 'uploading', sent: 0, total: entry.file.size }));
    start(u, id, entry.file, newSlot(old.url, entry.aiGenerated));
  };
  const setAi = (id: string, aiGenerated: boolean) => {
    const slot = slots.get(id);
    if (slot !== undefined) slot.ai = aiGenerated;
    patch(id, (entry) => ({ ...entry, aiGenerated }));
    if (slot !== undefined) markAi(u, id, slot);
  };
  return { entries, add, retry, setAi };
}

export type VideosState = ReturnType<typeof useVideos>;

export function isMarked(entry: VideoEntry): boolean {
  return entry.phase.kind === 'ready' && entry.phase.asset.aiGenerated;
}
