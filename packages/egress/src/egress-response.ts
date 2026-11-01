import type { RawResponse } from './perform-request.ts';

export interface EgressResponse {
  status: number;
  headers: Headers;
  url: string;
  redirected: boolean;
  bytes(): Promise<Uint8Array>;
  text(): Promise<string>;
  json(): Promise<unknown>;
  chunks(): AsyncIterable<Uint8Array>;
  discard(): void;
}

async function collect(chunks: AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of chunks) {
    parts.push(chunk);
    total += chunk.byteLength;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

export function toEgressResponse(raw: RawResponse): EgressResponse {
  let used = false;
  const claim = (): AsyncIterable<Uint8Array> => {
    if (used) {
      throw new TypeError('response body already read');
    }
    used = true;
    return raw.chunks;
  };
  const read = async (): Promise<Uint8Array> => collect(claim());
  return {
    status: raw.status,
    headers: raw.headers,
    url: raw.url,
    redirected: raw.redirected,
    bytes: read,
    text: async () => new TextDecoder().decode(await read()),
    json: async () => JSON.parse(new TextDecoder().decode(await read())),
    chunks: claim,
    discard: raw.discard,
  };
}
