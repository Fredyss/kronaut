import type {
  BaseContext,
  ProviderHttp,
  ProviderHttpResponse,
  ProviderLogger,
  ProviderState,
  PublishContext,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';

export interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
  readonly signal?: AbortSignal;
}

export interface ScriptedExchange {
  readonly method?: string;
  readonly url: string | RegExp;
  readonly status?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly json?: unknown;
  readonly text?: string;
  readonly bytes?: Uint8Array;
  readonly error?: Error;
}

export interface ScriptedHttp extends ProviderHttp {
  readonly calls: readonly RecordedRequest[];
  assertDone(): void;
}

class ScriptMismatch extends Error {
  override readonly name = 'ScriptMismatch';
}

function matches(exchange: ScriptedExchange, method: string, url: string): boolean {
  if ((exchange.method ?? 'GET').toUpperCase() !== method) return false;
  if (typeof exchange.url === 'string') return exchange.url === url;
  exchange.url.lastIndex = 0;
  return exchange.url.test(url);
}

function respond(exchange: ScriptedExchange, url: string): ProviderHttpResponse {
  const headers = new Headers(exchange.headers);
  let payload: Uint8Array;
  if (exchange.bytes !== undefined) payload = exchange.bytes;
  else if (exchange.json !== undefined) {
    payload = new TextEncoder().encode(JSON.stringify(exchange.json));
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  } else payload = new TextEncoder().encode(exchange.text ?? '');
  const text = async () => new TextDecoder().decode(payload);
  return {
    status: exchange.status ?? 200,
    headers,
    url,
    bytes: async () => payload,
    text,
    json: async () => JSON.parse(await text()),
  };
}

export function scriptedHttp(script: readonly ScriptedExchange[]): ScriptedHttp {
  const calls: RecordedRequest[] = [];
  const mismatches: string[] = [];
  let next = 0;
  return {
    calls,
    async request(input, init = {}) {
      const method = (init.method ?? 'GET').toUpperCase();
      const url = String(input);
      calls.push({
        method,
        url,
        headers: { ...init.headers },
        ...(init.body === undefined ? {} : { body: init.body }),
        ...(init.signal === undefined ? {} : { signal: init.signal }),
      });
      const exchange = script[next];
      if (exchange === undefined || !matches(exchange, method, url)) {
        const message = `unexpected ${method} ${url} at step ${next}`;
        mismatches.push(message);
        throw new ScriptMismatch(message);
      }
      next += 1;
      if (exchange.error !== undefined) throw exchange.error;
      return respond(exchange, url);
    },
    fetch: () => Promise.reject(new ScriptMismatch('providers use request(), not fetch()')),
    assertDone() {
      if (mismatches.length > 0) throw new Error(mismatches.join('\n'));
      if (next !== script.length)
        throw new Error(`${script.length - next} scripted exchanges were never requested`);
    },
  };
}

export function egressError(code: string): Error {
  const error = new Error(code);
  error.name = 'EgressError';
  return Object.assign(error, { code });
}

export const silentLogger: ProviderLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export function onlyAccount<T>(accounts: readonly T[]): T {
  const [account] = accounts;
  if (accounts.length !== 1 || account === undefined)
    throw new Error(`expected one connected account, got ${accounts.length}`);
  return account;
}

export const TEST_NOW = Temporal.Instant.from('2026-10-21T12:00:00Z');

export function testBaseContext(http: ProviderHttp, now = TEST_NOW): BaseContext {
  return { http, logger: silentLogger, signal: new AbortController().signal, now: () => now };
}

export interface TestMedia {
  readonly url: string;
  readonly bytes: Uint8Array;
}

export interface TestPublishContext {
  readonly ctx: PublishContext;
  readonly checkpoints: readonly ProviderState[];
  readonly events: readonly string[];
}

export function testPublishContext(
  http: ProviderHttp,
  media: Readonly<Record<string, TestMedia>> = {},
  now = TEST_NOW,
): TestPublishContext {
  const checkpoints: ProviderState[] = [];
  const events: string[] = [];
  const find = (id: string): TestMedia => {
    const item = media[id];
    if (item === undefined) throw new Error(`no test media ${id}`);
    return item;
  };
  const ctx: PublishContext = {
    ...testBaseContext(
      {
        request: (url, init) => {
          events.push(`request:${init?.method ?? 'GET'} ${String(url)}`);
          return http.request(url, init);
        },
        fetch: http.fetch,
      },
      now,
    ),
    media: {
      signedUrl: async (id) => find(id).url,
      read: async (id) => find(id).bytes,
    },
    step: async (id) => {
      events.push(`step:${id}`);
    },
    checkpoint: async (state) => {
      checkpoints.push(structuredClone(state));
      events.push('checkpoint');
    },
  };
  return { ctx, checkpoints, events };
}
