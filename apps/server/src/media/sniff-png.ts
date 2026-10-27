import { crc32 } from 'node:zlib';
import { ascii, type Dimensions, fail, type Span, u32be } from './sniff-bytes.ts';

export const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

const PNG_CRITICAL: ReadonlySet<string> = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND']);
const PNG_BIT_DEPTHS: Readonly<Record<number, readonly number[]>> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};
const PNG_MAX_DIMENSION = 0x7fffffff;
const CHUNK_TYPE_RE = /^[A-Za-z]{4}$/;

interface PngChunk extends Span {
  readonly type: string;
}

export interface PngLayout extends Dimensions {
  readonly chunks: readonly PngChunk[];
}

type PngHeader = Dimensions & { colorType: number };

interface PngState {
  header: PngHeader | null;
  palette: boolean;
  data: boolean;
  readonly chunks: PngChunk[];
}

interface RawChunk extends PngChunk {
  readonly length: number;
}

function readChunk(b: Uint8Array, pos: number): RawChunk {
  if (pos + 12 > b.length) fail('png is truncated');
  const length = u32be(b, pos);
  const type = ascii(b, pos + 4, 4);
  if (length > PNG_MAX_DIMENSION) fail('png chunk is too long');
  if (!CHUNK_TYPE_RE.test(type)) fail('png chunk type is invalid');
  const dataEnd = pos + 8 + length;
  const end = dataEnd + 4;
  if (end > b.length) fail('png chunk overruns the file');
  if (crc32(b.subarray(pos + 4, dataEnd)) !== u32be(b, dataEnd)) fail('png chunk crc mismatch');
  return { type, start: pos, end, length };
}

function readHeader(b: Uint8Array, { type, length, start: pos }: RawChunk): PngHeader {
  if (type !== 'IHDR' || length !== 13) fail('png must start with IHDR');
  const width = u32be(b, pos + 8);
  const height = u32be(b, pos + 12);
  const bitDepth = b[pos + 16] ?? 0;
  const colorType = b[pos + 17] ?? 0;
  if (width < 1 || height < 1 || width > PNG_MAX_DIMENSION || height > PNG_MAX_DIMENSION) {
    fail('png dimensions are invalid');
  }
  if (!PNG_BIT_DEPTHS[colorType]?.includes(bitDepth)) fail('png colour type is invalid');
  if (b[pos + 18] !== 0 || b[pos + 19] !== 0 || (b[pos + 20] ?? 2) > 1) {
    fail('png header method is invalid');
  }
  return { width, height, colorType };
}

function headerFor(b: Uint8Array, state: PngState, chunk: RawChunk): PngHeader {
  const { type } = chunk;
  if (state.header === null) {
    state.header = readHeader(b, chunk);
  } else if (type === 'IHDR') {
    fail('png has more than one IHDR');
  } else if ((type.charCodeAt(0) & 0x20) === 0 && !PNG_CRITICAL.has(type)) {
    fail('png has an unknown critical chunk');
  }
  return state.header;
}

function markChunk(state: PngState, header: PngHeader, type: string): void {
  if (type === 'PLTE') state.palette = true;
  if (type === 'IDAT') {
    if (header.colorType === 3 && !state.palette) fail('png palette image has no PLTE');
    state.data = true;
  }
}

export function parsePng(b: Uint8Array): PngLayout {
  const state: PngState = { header: null, palette: false, data: false, chunks: [] };
  let pos: number = PNG_MAGIC.length;
  for (;;) {
    const chunk = readChunk(b, pos);
    const { type, end, length } = chunk;
    const header = headerFor(b, state, chunk);
    markChunk(state, header, type);
    state.chunks.push({ type, start: pos, end });
    pos = end;
    if (type === 'IEND') {
      if (length !== 0 || !state.data) fail('png has no image data');
      return { width: header.width, height: header.height, chunks: state.chunks };
    }
  }
}
