import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';
import { Dispatcher } from 'undici';
import { describe, expect, it } from 'vitest';
import { createHttpClient } from './client.ts';
import { EgressError } from './errors.ts';
import type { EgressPolicy } from './policy.ts';

interface ResponseHandler {
  onRequestStart(controller: unknown, context: unknown): void;
  onResponseStart(
    controller: unknown,
    status: number,
    headers: Record<string, string>,
    message: string,
  ): void;
  onResponseData(controller: unknown, chunk: Buffer): void;
  onResponseEnd(controller: unknown, trailers: Record<string, string>): void;
  onResponseError(controller: unknown, error: Error): void;
}

interface Script {
  respond: boolean;
  status?: number;
  headers?: Record<string, string>;
  chunks?: readonly (string | Uint8Array)[];
  complete?: boolean;
}

class ScriptedDispatcher extends Dispatcher {
  readonly script: Script;
  aborts: unknown[] = [];

  constructor(script: Script) {
    super();
    this.script = script;
  }

  override dispatch(
    _options: Dispatcher.DispatchOptions,
    handler: Dispatcher.DispatchHandler,
  ): boolean {
    const target = handler as unknown as ResponseHandler;
    const { script } = this;
    const controller = {
      paused: false,
      aborted: false,
      reason: null as unknown,
      pause() {},
      resume() {},
      abort: (reason: Error) => {
        this.aborts.push(reason);
        target.onResponseError(controller, reason);
      },
    };
    if (!script.respond) {
      return true;
    }
    setImmediate(() => {
      target.onRequestStart(controller, {});
      target.onResponseStart(controller, script.status ?? 200, script.headers ?? {}, 'OK');
      for (const chunk of script.chunks ?? []) {
        target.onResponseData(controller, Buffer.from(chunk));
      }
      if (script.complete) {
        target.onResponseEnd(controller, {});
      }
    });
    return true;
  }
}

function clientFor(script: Script, overrides: Partial<EgressPolicy> = {}) {
  const dispatcher = new ScriptedDispatcher(script);
  const client = createHttpClient(
    {
      allowedHosts: ['api.example.com'],
      maxResponseBytes: 1000,
      timeoutMs: 80,
      maxRedirects: 2,
      ...overrides,
    },
    { dispatcher },
  );
  return { client, dispatcher };
}

const URL_ = 'https://api.example.com/stream';

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the promise to reject');
}

describe('streamed bodies', () => {
  it('concatenates chunks that stay under the cap', async () => {
    const { client } = clientFor({ respond: true, chunks: ['abc', 'def', 'ghi'], complete: true });
    const response = await client.request(URL_);
    expect(await response.text()).toBe('abcdefghi');
  });

  it('aborts the transfer as soon as the running total exceeds the cap', async () => {
    const { client, dispatcher } = clientFor({
      respond: true,
      chunks: ['a'.repeat(600), 'b'.repeat(600), 'c'.repeat(600)],
      complete: true,
    });
    const response = await client.request(URL_);
    const error = await errorOf(response.bytes());
    expect(error).toBeInstanceOf(EgressError);
    expect((error as EgressError).code).toBe('response_too_large');
    expect(dispatcher.aborts.length).toBeGreaterThan(0);
  });

  it('accepts a multi-chunk body of exactly the cap', async () => {
    const { client } = clientFor({
      respond: true,
      chunks: ['a'.repeat(500), 'b'.repeat(500)],
      complete: true,
    });
    const response = await client.request(URL_);
    expect((await response.bytes()).byteLength).toBe(1000);
  });

  it('applies the cap to the fetch adapter stream', async () => {
    const { client } = clientFor({
      respond: true,
      chunks: ['a'.repeat(600), 'b'.repeat(600)],
      complete: true,
    });
    const response = await client.fetch(URL_);
    await expect(response.text()).rejects.toMatchObject({ code: 'response_too_large' });
  });
});

describe('total timeout', () => {
  it('fails while the body is stalled mid-transfer', async () => {
    const { client, dispatcher } = clientFor({
      respond: true,
      chunks: ['partial'],
      complete: false,
    });
    const response = await client.request(URL_);
    expect(response.status).toBe(200);
    const error = await errorOf(response.text());
    expect(error).toBeInstanceOf(EgressError);
    expect((error as EgressError).code).toBe('timeout');
    expect(dispatcher.aborts.length).toBeGreaterThan(0);
  });

  it('fails when the dispatcher never answers', async () => {
    const { client } = clientFor({ respond: false });
    const started = performance.now();
    const error = await errorOf(client.request(URL_));
    expect(error).toBeInstanceOf(EgressError);
    expect((error as EgressError).code).toBe('timeout');
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('fails the fetch adapter body read on a stall', async () => {
    const { client } = clientFor({ respond: true, chunks: ['partial'], complete: false });
    const response = await client.fetch(URL_);
    await expect(response.text()).rejects.toMatchObject({ code: 'timeout' });
  });

  it('keeps the timeout code when a decoded body stalls', async () => {
    const { client } = clientFor({
      respond: true,
      headers: { 'content-encoding': 'gzip' },
      chunks: [gzipSync('partial body').subarray(0, 12)],
      complete: false,
    });
    const response = await client.fetch(URL_);
    await expect(response.text()).rejects.toMatchObject({ code: 'timeout' });
  });

  it('surfaces the caller abort reason while a decoded body stalls', async () => {
    const { client } = clientFor(
      {
        respond: true,
        headers: { 'content-encoding': 'gzip' },
        chunks: [gzipSync('partial body').subarray(0, 12)],
        complete: false,
      },
      { timeoutMs: 5000 },
    );
    const controller = new AbortController();
    const reason = new Error('caller gave up');
    const response = await client.fetch(URL_, { signal: controller.signal });
    const pending = errorOf(response.text());
    setTimeout(() => controller.abort(reason), 20);
    expect(await pending).toBe(reason);
  });

  it('surfaces the caller abort reason after the request wrapper is collected', async () => {
    setFlagsFromString('--expose-gc');
    const gc = runInNewContext('gc') as () => void;
    const { client } = clientFor(
      { respond: true, chunks: ['partial'], complete: false },
      { timeoutMs: 5000 },
    );
    const controller = new AbortController();
    const reason = new Error('caller gave up');
    const response = await client.fetch(URL_, { signal: controller.signal });
    const pending = errorOf(response.text());
    gc();
    controller.abort(reason);
    expect(await pending).toBe(reason);
  });

  it('follows the Request signal when init leaves signal undefined', async () => {
    const { client } = clientFor(
      { respond: true, chunks: ['partial'], complete: false },
      { timeoutMs: 5000 },
    );
    const controller = new AbortController();
    const reason = new Error('caller gave up');
    const input = new Request(URL_, { signal: controller.signal });
    const forwarded: { signal?: AbortSignal | undefined } = { signal: undefined };
    const response = await client.fetch(input, forwarded as RequestInit);
    const pending = errorOf(response.text());
    controller.abort(reason);
    expect(await pending).toBe(reason);
  });

  it('ignores the Request signal when init sets signal to null', async () => {
    const { client } = clientFor(
      { respond: true, chunks: ['partial'], complete: false },
      { timeoutMs: 50 },
    );
    const controller = new AbortController();
    const input = new Request(URL_, { signal: controller.signal });
    const response = await client.fetch(input, { signal: null });
    const pending = errorOf(response.text());
    controller.abort(new Error('caller gave up'));
    const error = await pending;
    expect(error).toBeInstanceOf(EgressError);
    expect((error as EgressError).code).toBe('timeout');
  });

  it('does not raise unhandled errors when a response is never read', async () => {
    const { client } = clientFor({ respond: true, chunks: ['partial'], complete: false });
    const response = await client.request(URL_);
    expect(response.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it('surfaces the caller abort reason during a stalled body', async () => {
    const { client } = clientFor(
      { respond: true, chunks: ['partial'], complete: false },
      { timeoutMs: 5000 },
    );
    const controller = new AbortController();
    const reason = new Error('caller gave up');
    const response = await client.request(URL_, { signal: controller.signal });
    const pending = errorOf(response.text());
    setTimeout(() => controller.abort(reason), 20);
    expect(await pending).toBe(reason);
  });

  it('surfaces the caller abort reason when the dispatcher never answers', async () => {
    const { client } = clientFor({ respond: false }, { timeoutMs: 5000 });
    const controller = new AbortController();
    const reason = new Error('caller gave up');
    const pending = errorOf(client.request(URL_, { signal: controller.signal }));
    setTimeout(() => controller.abort(reason), 20);
    expect(await pending).toBe(reason);
  });
});
