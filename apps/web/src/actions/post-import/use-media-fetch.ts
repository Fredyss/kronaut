import { useEffect, useRef, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { sleep } from '../../base/api/retry.ts';
import { type FetchProgress, fetchAll, type MediaResult } from './media-fetch.ts';

export interface MediaFetch {
  readonly results: ReadonlyMap<string, MediaResult>;
  readonly progress: FetchProgress | null;
  readonly cancelled: boolean;
  readonly limited: boolean;
  cancel(): void;
}

function forgetFailed(store: Map<string, MediaResult>, keys: Map<string, string>) {
  for (const [url, result] of store) {
    if (result.kind !== 'failed') continue;
    store.delete(url);
    keys.delete(url);
  }
}

export function useMediaFetch(
  workspaceId: string,
  urls: readonly string[] | null,
  nonce: number,
): MediaFetch {
  const client = useApiClient();
  const store = useRef(new Map<string, MediaResult>());
  const keys = useRef(new Map<string, string>());
  const retriedFor = useRef(nonce);
  const running = useRef<AbortController | null>(null);
  const [results, setResults] = useState<ReadonlyMap<string, MediaResult>>(() => new Map());
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [cancelledFor, setCancelledFor] = useState<number | null>(null);
  const [limitedFor, setLimitedFor] = useState<number | null>(null);
  const wanted = urls?.join('\n') ?? null;

  useEffect(() => {
    if (wanted === null || cancelledFor === nonce || limitedFor === nonce) return;
    if (retriedFor.current !== nonce) {
      retriedFor.current = nonce;
      forgetFailed(store.current, keys.current);
      setResults(new Map(store.current));
    }
    const pending = (wanted === '' ? [] : wanted.split('\n')).filter(
      (url) => !store.current.has(url),
    );
    if (pending.length === 0) return;
    const controller = new AbortController();
    running.current = controller;
    const api = { client, workspaceId, wait: sleep };
    const run = { api, urls: pending, keys: keys.current, store: store.current };
    void fetchAll({ ...run, signal: controller.signal }, (step) => {
      setResults(new Map(store.current));
      if (!controller.signal.aborted) setProgress(step);
    }).then((limited) => {
      if (limited && !controller.signal.aborted) setLimitedFor(nonce);
    });
    return () => {
      controller.abort();
      setProgress(null);
    };
  }, [wanted, nonce, cancelledFor, limitedFor, client, workspaceId]);

  const cancel = () => {
    running.current?.abort();
    setCancelledFor(nonce);
    setProgress(null);
  };
  const cancelled = cancelledFor === nonce;
  return { results, progress, cancelled, limited: limitedFor === nonce, cancel };
}
