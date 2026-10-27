import { pipeline, Readable, type Transform } from 'node:stream';
import { constants, createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { EgressError } from './errors.ts';

const MAX_CONTENT_CODINGS = 5;
// sync flush matches fetch: an empty or truncated encoded body ends cleanly instead of erroring
const ZLIB_OPTIONS = { flush: constants.Z_SYNC_FLUSH, finishFlush: constants.Z_SYNC_FLUSH };
const BROTLI_OPTIONS = {
  flush: constants.BROTLI_OPERATION_FLUSH,
  finishFlush: constants.BROTLI_OPERATION_FLUSH,
};
const gunzip = (): Transform => createGunzip(ZLIB_OPTIONS);
const DECODERS: ReadonlyMap<string, () => Transform> = new Map([
  ['gzip', gunzip],
  ['x-gzip', gunzip],
  ['deflate', () => createInflate(ZLIB_OPTIONS)],
  ['br', () => createBrotliDecompress(BROTLI_OPTIONS)],
]);

function noop(): void {}

export function contentDecoders(headers: Headers): (() => Transform)[] {
  const codings = (headers.get('content-encoding') ?? '')
    .split(',')
    .map((coding) => coding.trim().toLowerCase())
    .filter((coding) => coding !== '' && coding !== 'identity');
  if (codings.length > MAX_CONTENT_CODINGS) {
    throw new EgressError('network', 'too many content codings');
  }
  const decoders: (() => Transform)[] = [];
  for (const coding of codings.reverse()) {
    const decoder = DECODERS.get(coding);
    if (decoder === undefined) {
      return [];
    }
    decoders.push(decoder);
  }
  return decoders;
}

export async function* decodeChunks(
  source: AsyncIterable<Uint8Array>,
  decoders: readonly (() => Transform)[],
  limit: number,
  release: () => void,
): AsyncGenerator<Uint8Array> {
  const upstream: { failed: boolean; error: unknown } = { failed: false, error: undefined };
  const guarded = (async function* (): AsyncGenerator<Uint8Array> {
    try {
      yield* source;
    } catch (error) {
      upstream.failed = true;
      upstream.error = error;
      throw error;
    }
  })();
  const output = decoders.reduce<Readable>(
    (previous, create) => pipeline(previous, create(), noop),
    Readable.from(guarded),
  );
  try {
    let total = 0;
    for await (const chunk of output) {
      const bytes: Uint8Array = chunk;
      total += bytes.byteLength;
      if (total > limit) {
        throw new EgressError('response_too_large', 'response exceeds the size limit');
      }
      yield bytes;
    }
  } catch (error) {
    if (upstream.failed) {
      throw upstream.error;
    }
    if (error instanceof EgressError) {
      throw error;
    }
    throw new EgressError('network', 'invalid content encoding', { cause: error });
  } finally {
    output.destroy();
    release();
  }
}
