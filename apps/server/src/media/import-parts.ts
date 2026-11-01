import { MediaError } from './errors.ts';
import { originalName } from './ingest.ts';

const IMPORT_EXTENSION = /\.(?:jpe?g|png|webp|mp4|mov|webm)$/i;

export async function* exactParts(
  chunks: AsyncIterable<Uint8Array>,
  size: number,
): AsyncGenerator<Uint8Array> {
  let part = new Uint8Array(size);
  let filled = 0;
  for await (const chunk of chunks) {
    let offset = 0;
    while (offset < chunk.byteLength) {
      const taken = Math.min(size - filled, chunk.byteLength - offset);
      part.set(chunk.subarray(offset, offset + taken), filled);
      filled += taken;
      offset += taken;
      if (filled === size) {
        yield part;
        part = new Uint8Array(size);
        filled = 0;
      }
    }
  }
  if (filled > 0) yield part.subarray(0, filled);
}

// A last segment without a media extension could be a token, so it is never kept as a name.
export function importFilename(url: string): string | undefined {
  try {
    const segment = new URL(url).pathname.split('/').pop() ?? '';
    const name = decodeURIComponent(segment);
    originalName(name);
    return IMPORT_EXTENSION.test(name) ? name : undefined;
  } catch (error) {
    if (error instanceof MediaError || error instanceof URIError) return undefined;
    throw error;
  }
}
