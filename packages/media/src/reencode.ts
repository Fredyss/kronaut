import { Worker } from 'node:worker_threads';

export type ReencodeFormat = 'jpeg' | 'png' | 'webp';
export type ReencodeErrorKind = 'undecodable' | 'too_many_pixels';

export const MEDIA_IMAGE_MAX_PIXELS = 50_000_000;
export const MAX_CONCURRENT_REENCODES = 2;

export interface ReencodedImage {
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
}

export interface ReencodeJob {
  readonly bytes: Uint8Array;
  readonly format: ReencodeFormat;
}

export type ReencodeReply =
  | {
      readonly ok: true;
      readonly bytes: Uint8Array<ArrayBuffer>;
      readonly width: number;
      readonly height: number;
    }
  | { readonly ok: false; readonly kind: ReencodeErrorKind; readonly message: string };

export class ReencodeError extends Error {
  readonly kind: ReencodeErrorKind;

  constructor(kind: ReencodeErrorKind, message: string) {
    super(message);
    this.name = 'ReencodeError';
    this.kind = kind;
  }
}

const WORKER_URL = new URL('./reencode-worker.ts', import.meta.url);

let running = 0;
const waiting: (() => void)[] = [];

function acquire(): Promise<void> {
  if (running < MAX_CONCURRENT_REENCODES) {
    running++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release(): void {
  const next = waiting.shift();
  if (next === undefined) running--;
  else next();
}

export async function reencodeImage(
  bytes: Uint8Array,
  format: ReencodeFormat,
): Promise<ReencodedImage> {
  await acquire();
  try {
    return await runWorker(bytes, format);
  } finally {
    release();
  }
}

function runWorker(bytes: Uint8Array, format: ReencodeFormat): Promise<ReencodedImage> {
  const input = new Uint8Array(bytes);
  const job: ReencodeJob = { bytes: input, format };
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(WORKER_URL, { workerData: job, transferList: [input.buffer] });
    worker.once('message', (reply: ReencodeReply) => {
      settled = true;
      void worker.terminate();
      if (reply.ok) resolve({ bytes: reply.bytes, width: reply.width, height: reply.height });
      else reject(new ReencodeError(reply.kind, reply.message));
    });
    worker.once('error', (error) => {
      if (settled) return;
      settled = true;
      reject(new Error('image re-encode worker failed', { cause: error }));
    });
    worker.once('exit', (code) => {
      if (settled) return;
      settled = true;
      reject(new Error(`image re-encode worker exited with code ${code} without a result`));
    });
  });
}
