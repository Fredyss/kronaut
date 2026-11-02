import { type Dimensions, fail, type Span, u16be } from './sniff-bytes.ts';

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;

interface JpegSegment extends Span {
  readonly marker: number;
}

export interface JpegLayout extends Dimensions {
  readonly segments: readonly JpegSegment[];
}

interface JpegState {
  frame: Dimensions | null;
  scans: number;
  readonly segments: JpegSegment[];
}

interface Marker {
  readonly marker: number;
  readonly start: number;
  readonly next: number;
}

interface Segment extends JpegSegment {
  readonly length: number;
  readonly payload: number;
}

function isSof(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function isRst(marker: number): boolean {
  return marker >= 0xd0 && marker <= 0xd7;
}

function scanEntropy(b: Uint8Array, from: number): number {
  let p = from;
  for (;;) {
    p = b.indexOf(0xff, p);
    if (p === -1) fail('jpeg scan is truncated');
    let q = p + 1;
    while (q < b.length && b[q] === 0xff) q++;
    if (q >= b.length) fail('jpeg scan is truncated');
    const next = b[q] ?? 0;
    if (next === 0x00 || isRst(next)) {
      p = q + 1;
      continue;
    }
    return p;
  }
}

function readMarker(b: Uint8Array, at: number): Marker {
  let pos = at;
  if (pos >= b.length || b[pos] !== 0xff) fail('jpeg marker expected');
  while (pos < b.length && b[pos] === 0xff) pos++;
  if (pos >= b.length) fail('jpeg is truncated');
  const marker = b[pos] ?? 0;
  return { marker, start: pos - 1, next: pos + 1 };
}

function readSegment(b: Uint8Array, { marker, start, next: pos }: Marker): Segment {
  if (pos + 2 > b.length) fail('jpeg is truncated');
  const length = u16be(b, pos);
  const payload = pos + 2;
  const end = pos + length;
  if (length < 2 || end > b.length) fail('jpeg segment overruns the file');
  return { marker, start, end, length, payload };
}

function takeFrame(b: Uint8Array, state: JpegState, { payload, length }: Segment): void {
  if (state.frame !== null || state.scans > 0) fail('jpeg has more than one frame');
  const components = b[payload + 5] ?? 0;
  if (components < 1 || length !== 8 + 3 * components) fail('jpeg frame header is inconsistent');
  const height = u16be(b, payload + 1);
  const width = u16be(b, payload + 3);
  if (width === 0 || height === 0) fail('jpeg frame has no dimensions');
  state.frame = { width, height };
}

function takeScan(b: Uint8Array, state: JpegState, segment: Segment): number {
  const { marker, start, end, payload, length } = segment;
  if (state.frame === null) fail('jpeg scan before frame');
  const components = b[payload] ?? 0;
  if (components < 1 || components > 4 || length !== 6 + 2 * components) {
    fail('jpeg scan header is inconsistent');
  }
  const scanEnd = scanEntropy(b, end);
  state.scans++;
  state.segments.push({ marker, start, end: scanEnd });
  return scanEnd;
}

function takeSegment(b: Uint8Array, state: JpegState, segment: Segment): number {
  const { marker, start, end } = segment;
  if (isSof(marker)) takeFrame(b, state, segment);
  if (marker === SOS) return takeScan(b, state, segment);
  state.segments.push({ marker, start, end });
  return end;
}

export function parseJpeg(b: Uint8Array): JpegLayout {
  const state: JpegState = { frame: null, scans: 0, segments: [] };
  let pos = 2;
  for (;;) {
    const read = readMarker(b, pos);
    const { marker } = read;
    if (marker === EOI) {
      if (state.frame === null || state.scans === 0) fail('jpeg has no frame or scan');
      return { ...state.frame, segments: state.segments };
    }
    if (marker < 0xc0 || marker === SOI || isRst(marker)) fail('unexpected jpeg marker');
    pos = takeSegment(b, state, readSegment(b, read));
  }
}
