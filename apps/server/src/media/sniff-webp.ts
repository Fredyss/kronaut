import { ascii, type Dimensions, fail, type Span, u16le, u24le, u32le } from './sniff-bytes.ts';

const VP8X_ANIMATION = 0x02;
const FOURCC_RE = /^[A-Za-z0-9 ]{4}$/;
const MAX_CANVAS_AREA = 0xffffffff;

interface WebpChunk extends Span {
  readonly fourcc: string;
  readonly data: number;
  readonly size: number;
}

export interface WebpLayout extends Dimensions {
  readonly chunks: readonly WebpChunk[];
}

function parseVp8(b: Uint8Array, chunk: WebpChunk): Dimensions {
  if (chunk.size < 10) fail('vp8 header is truncated');
  const at = chunk.data;
  const tag = u24le(b, at);
  if ((tag & 1) !== 0) fail('vp8 bitstream does not start with a key frame');
  if (((tag >> 1) & 7) > 3) fail('vp8 version is invalid');
  if (tag >>> 5 > chunk.size - 10) fail('vp8 partition overruns the chunk');
  if (b[at + 3] !== 0x9d || b[at + 4] !== 0x01 || b[at + 5] !== 0x2a) {
    fail('vp8 start code is missing');
  }
  const width = u16le(b, at + 6) & 0x3fff;
  const height = u16le(b, at + 8) & 0x3fff;
  if (width === 0 || height === 0) fail('vp8 has no dimensions');
  return { width, height };
}

function parseVp8l(b: Uint8Array, chunk: WebpChunk): Dimensions {
  if (chunk.size < 5) fail('vp8l header is truncated');
  if (b[chunk.data] !== 0x2f) fail('vp8l signature is missing');
  const bits = u32le(b, chunk.data + 1);
  if (bits >>> 29 !== 0) fail('vp8l version is invalid');
  return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
}

function parseBitstream(b: Uint8Array, chunk: WebpChunk): Dimensions {
  return chunk.fourcc === 'VP8L' ? parseVp8l(b, chunk) : parseVp8(b, chunk);
}

function readChunks(b: Uint8Array): WebpChunk[] {
  if (b.length < 20) fail('webp is truncated');
  const riffSize = u32le(b, 4);
  const riffEnd = 8 + riffSize;
  if (riffSize < 12 || riffEnd > b.length) fail('webp riff size is inconsistent');
  const chunks: WebpChunk[] = [];
  let pos = 12;
  while (pos < riffEnd) {
    if (pos + 8 > riffEnd) fail('webp chunk header is truncated');
    const fourcc = ascii(b, pos, 4);
    if (!FOURCC_RE.test(fourcc)) fail('webp chunk fourcc is invalid');
    const size = u32le(b, pos + 4);
    const end = pos + 8 + size + (size & 1);
    if (end > riffEnd) fail('webp chunk overruns the riff');
    chunks.push({ fourcc, start: pos, data: pos + 8, size, end });
    pos = end;
  }
  return chunks;
}

function parseExtended(b: Uint8Array, first: WebpChunk, chunks: WebpChunk[]): WebpLayout {
  if (first.fourcc !== 'VP8X') fail('webp has no image chunk');
  if (first.size !== 10) fail('webp vp8x chunk has the wrong size');
  const width = u24le(b, first.data + 4) + 1;
  const height = u24le(b, first.data + 7) + 1;
  if (width * height > MAX_CANVAS_AREA) fail('webp canvas is too large');
  const rest = chunks.slice(1);
  if (rest.some((c) => c.fourcc === 'VP8X')) fail('webp has more than one vp8x chunk');
  if (((b[first.data] ?? 0) & VP8X_ANIMATION) !== 0) {
    if (!rest.some((c) => c.fourcc === 'ANIM') || !rest.some((c) => c.fourcc === 'ANMF')) {
      fail('animated webp has no frames');
    }
    return { width, height, chunks };
  }
  const images = rest.filter((c) => c.fourcc === 'VP8 ' || c.fourcc === 'VP8L');
  const [image] = images;
  if (image === undefined || images.length !== 1) fail('webp must have exactly one image chunk');
  const frame = parseBitstream(b, image);
  if (frame.width !== width || frame.height !== height) {
    fail('webp image does not match the canvas');
  }
  return { width, height, chunks };
}

export function parseWebp(b: Uint8Array): WebpLayout {
  const chunks = readChunks(b);
  const [first] = chunks;
  if (first === undefined) fail('webp has no chunks');
  if (first.fourcc === 'VP8 ' || first.fourcc === 'VP8L') {
    return { ...parseBitstream(b, first), chunks };
  }
  return parseExtended(b, first, chunks);
}
