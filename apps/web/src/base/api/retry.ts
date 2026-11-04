import { errorStatus } from './errors.ts';

const BACKOFF_MS: readonly number[] = [1000, 2000, 4000];

export type Wait = (ms: number, signal: AbortSignal) => Promise<void>;

export interface Waiting {
  readonly wait: Wait;
}

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

function retryable(error: unknown): boolean {
  const status = errorStatus(error);
  return status === null || status === 0 || status >= 500;
}

export async function withRetry<T>(api: Waiting, signal: AbortSignal, call: () => Promise<T>) {
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
