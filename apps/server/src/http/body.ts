export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

const EMPTY = new Uint8Array(0);

export async function readBody(request: Request, limit: number): Promise<Uint8Array | null> {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > limit) return null;
  }
  if (request.body === null) return EMPTY;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  if (chunks.length === 0) return EMPTY;
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function isJsonContentType(header: string | null): boolean {
  if (header === null) return false;
  const [type] = header.split(';');
  return type?.trim().toLowerCase() === 'application/json';
}

export function queryObject(search: URLSearchParams): Record<string, string | string[]> {
  const query = Object.create(null) as Record<string, string | string[]>;
  for (const key of new Set(search.keys())) {
    const values = search.getAll(key);
    query[key] = values.length === 1 ? (values[0] ?? '') : values;
  }
  return query;
}
