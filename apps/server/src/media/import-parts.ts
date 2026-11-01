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
