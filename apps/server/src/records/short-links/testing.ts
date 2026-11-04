import type { EgressResponse, HttpClient } from '@kronaut/egress';

export interface ShortenerReply {
  readonly status?: number;
  readonly body?: unknown;
  readonly error?: Error;
  readonly hang?: boolean;
}

export interface SeenCall {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly sensitive: readonly string[];
}

export interface ShortenerServer extends HttpClient {
  readonly calls: SeenCall[];
  reply(...replies: readonly ShortenerReply[]): void;
  reset(): void;
}

function response(url: string, reply: ShortenerReply): EgressResponse {
  const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
  const bytes = new TextEncoder().encode(text);
  return {
    status: reply.status ?? 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    url,
    redirected: false,
    bytes: async () => bytes,
    text: async () => text,
    json: async () => JSON.parse(text),
    async *chunks() {
      yield bytes;
    },
    discard() {},
  };
}

function aborted(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_, reject) => {
    if (signal === undefined) return;
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

export function shortenerServer(): ShortenerServer {
  const pending: ShortenerReply[] = [];
  const server: ShortenerServer = {
    calls: [],
    reply(...replies) {
      pending.push(...replies);
    },
    reset() {
      pending.length = 0;
      server.calls.length = 0;
    },
    async request(url, init) {
      server.calls.push({
        url: String(url),
        method: init?.method ?? 'GET',
        headers: { ...init?.headers },
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        sensitive: init?.sensitiveHeaders ?? [],
      });
      const reply = pending.shift();
      if (reply === undefined) throw new Error('no reply is scripted');
      if (reply.hang === true) return await aborted(init?.signal);
      if (reply.error !== undefined) throw reply.error;
      return response(String(url), reply);
    },
    fetch: () => Promise.reject(new Error('shorteners must use request')),
  };
  return server;
}

export function dubLink(id: string, url: string) {
  return { id, shortLink: `https://dub.sh/${id}`, url, domain: 'dub.sh', key: id };
}

export function kuttLink(id: string, target: string) {
  return { id, link: `https://kutt.to/${id}`, address: id, target };
}
