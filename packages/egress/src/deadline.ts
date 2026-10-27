import { EgressError } from './errors.ts';

export interface Deadline {
  readonly signal: AbortSignal;
  readonly timer: NodeJS.Timeout;
  timedOut(): boolean;
}

export function startDeadline(timeoutMs: number, callerSignal: AbortSignal | undefined): Deadline {
  const timeoutError = new EgressError('timeout', 'request timed out');
  const timeoutController = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeoutController.abort(timeoutError);
  }, timeoutMs);
  timer.unref();
  const signal =
    callerSignal === undefined
      ? timeoutController.signal
      : AbortSignal.any([timeoutController.signal, callerSignal]);
  return { signal, timer, timedOut: () => timedOut };
}

export function raceAbort<T>(
  pending: Promise<T>,
  signal: AbortSignal,
  discard: (late: T) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let aborted = false;
    const onAbort = (): void => {
      aborted = true;
      reject(signal.reason);
    };
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
    pending.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        if (aborted) {
          discard(value);
        } else {
          resolve(value);
        }
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        if (!aborted) {
          reject(error);
        }
      },
    );
  });
}
