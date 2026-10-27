import { crc32, deflateSync } from 'node:zlib';
import { expect } from 'vitest';
import { MediaError } from './errors.ts';

const encoder = new TextEncoder();

export function text(value: string): Uint8Array {
  return encoder.encode(value);
}

export function bytes(...parts: readonly (Uint8Array | readonly number[] | string)[]): Uint8Array {
  const arrays = parts.map((part) =>
    typeof part === 'string'
      ? text(part)
      : part instanceof Uint8Array
        ? part
        : Uint8Array.from(part),
  );
  const out = new Uint8Array(arrays.reduce((sum, a) => sum + a.byteLength, 0));
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.byteLength;
  }
  return out;
}

function be16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function le24(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
}

function le32(value: number): number[] {
  return [...le24(value), (value >>> 24) & 0xff];
}

export function includes(haystack: Uint8Array, needle: string | Uint8Array): boolean {
  return Buffer.from(haystack).includes(
    Buffer.from(typeof needle === 'string' ? text(needle) : needle),
  );
}

export function jpegSegment(
  marker: number,
  payload: Uint8Array | readonly number[] | string,
): Uint8Array {
  const body = bytes(payload);
  return bytes([0xff, marker, ...be16(body.byteLength + 2)], body);
}

export const JPEG_EXIF_SECRET = 'GPS 48.1486N 17.1077E';
export const JPEG_COMMENT_SECRET = 'camera owner Jane';

export interface JpegOptions {
  readonly width?: number;
  readonly height?: number;
  readonly progressive?: boolean;
  readonly exif?: boolean;
  readonly xmp?: boolean;
  readonly comment?: string;
}

const JFIF = jpegSegment(0xe0, bytes('JFIF\0', [1, 1, 0, 0, 1, 0, 1, 0, 0]));
const DQT = jpegSegment(0xdb, bytes([0], new Uint8Array(64).fill(1)));
const DHT_DC = jpegSegment(0xc4, bytes([0x00, 1], new Uint8Array(15), [0x00]));
const DHT_AC = jpegSegment(0xc4, bytes([0x10, 1], new Uint8Array(15), [0x00]));
const SOS_GRAY = jpegSegment(0xda, [1, 1, 0x00, 0, 63, 0]);

function grayScan(blocks: number): Uint8Array {
  const bits = '00'.repeat(blocks);
  const padded = bits.padEnd(Math.ceil(bits.length / 8) * 8, '1');
  const out: number[] = [];
  for (let i = 0; i < padded.length; i += 8) {
    const value = Number.parseInt(padded.slice(i, i + 8), 2);
    out.push(value);
    if (value === 0xff) out.push(0x00);
  }
  return Uint8Array.from(out);
}

export function jpegFixture(options: JpegOptions = {}): Uint8Array {
  const width = options.width ?? 1;
  const height = options.height ?? 1;
  const sofMarker = options.progressive === true ? 0xc2 : 0xc0;
  const sof = jpegSegment(sofMarker, [8, ...be16(height), ...be16(width), 1, 1, 0x11, 0]);
  const meta: Uint8Array[] = [];
  if (options.exif === true) {
    meta.push(jpegSegment(0xe1, bytes('Exif\0\0', 'MM\0*', [0, 0, 0, 8, 0, 0], JPEG_EXIF_SECRET)));
  }
  if (options.xmp === true) {
    meta.push(
      jpegSegment(0xe1, bytes('http://ns.adobe.com/xap/1.0/\0', '<x:xmpmeta>creator</x:xmpmeta>')),
    );
  }
  if (options.comment !== undefined) meta.push(jpegSegment(0xfe, options.comment));
  const blocks = Math.ceil(width / 8) * Math.ceil(height / 8);
  const scans =
    options.progressive === true
      ? [
          SOS_GRAY,
          grayScan(blocks),
          DHT_AC,
          jpegSegment(0xda, [1, 1, 0x00, 1, 63, 0]),
          Uint8Array.of(0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56),
          ...(options.comment === undefined ? [] : [jpegSegment(0xfe, options.comment)]),
          jpegSegment(0xda, [1, 1, 0x00, 1, 63, 0x10]),
          Uint8Array.of(0x78, 0x9a),
        ]
      : [SOS_GRAY, grayScan(blocks)];
  return bytes([0xff, 0xd8], JFIF, ...meta, DQT, sof, DHT_DC, DHT_AC, ...scans, [0xff, 0xd9]);
}

export function pngChunk(
  type: string,
  data: Uint8Array | readonly number[] | string = [],
): Uint8Array {
  const body = bytes(type, data);
  return bytes(be32(body.byteLength - 4), body, be32(crc32(body)));
}

export const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

export interface PngOptions {
  readonly width?: number;
  readonly height?: number;
}

export function pngIdat(width: number, height: number): Uint8Array {
  const row = bytes([0], new Uint8Array(width * 3).fill(0x80));
  const raw = bytes(...Array.from({ length: height }, () => row));
  return pngChunk('IDAT', deflateSync(raw));
}

export function pngIhdr(width: number, height: number, bitDepth = 8, colorType = 2): Uint8Array {
  return pngChunk('IHDR', [...be32(width), ...be32(height), bitDepth, colorType, 0, 0, 0]);
}

export function pngFixture(options: PngOptions = {}): Uint8Array {
  const width = options.width ?? 1;
  const height = options.height ?? 1;
  return bytes(PNG_SIGNATURE, pngIhdr(width, height), pngIdat(width, height), pngChunk('IEND'));
}

export function riffChunk(
  fourcc: string,
  data: Uint8Array | readonly number[] | string,
): Uint8Array {
  const body = bytes(data);
  const pad = body.byteLength % 2 === 1 ? [0] : [];
  return bytes(fourcc, le32(body.byteLength), body, pad);
}

export function webpFile(...chunks: readonly Uint8Array[]): Uint8Array {
  const payload = bytes('WEBP', ...chunks);
  return bytes('RIFF', le32(payload.byteLength), payload);
}

class BitWriter {
  readonly out: number[] = [];
  private bit = 0;

  write(value: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.bit === 0) this.out.push(0);
      const last = this.out.length - 1;
      this.out[last] = (this.out[last] ?? 0) | (((value >> i) & 1) << this.bit);
      this.bit = (this.bit + 1) % 8;
    }
  }
}

export function vp8lChunk(width: number, height: number): Uint8Array {
  const w = new BitWriter();
  w.write(width - 1, 14);
  w.write(height - 1, 14);
  w.write(0, 1);
  w.write(0, 3);
  w.write(0, 1);
  w.write(0, 1);
  w.write(0, 1);
  for (const symbol of [0, 0, 0, 255, 0]) {
    w.write(1, 1);
    w.write(0, 1);
    if (symbol < 2) {
      w.write(0, 1);
      w.write(symbol, 1);
    } else {
      w.write(1, 1);
      w.write(symbol, 8);
    }
  }
  return riffChunk('VP8L', bytes([0x2f], w.out));
}

export function vp8Chunk(width: number, height: number, keyFrame = true): Uint8Array {
  const partition = 4;
  const tag = (keyFrame ? 0 : 1) | (0 << 1) | (1 << 4) | (partition << 5);
  return riffChunk('VP8 ', [
    ...le24(tag),
    0x9d,
    0x01,
    0x2a,
    width & 0xff,
    (width >> 8) & 0x3f,
    height & 0xff,
    (height >> 8) & 0x3f,
    0x00,
    0x11,
    0x22,
    0x33,
  ]);
}

export const VP8X_ICC = 0x20;
export const VP8X_EXIF = 0x08;
export const VP8X_XMP = 0x04;
export const VP8X_ANIMATION = 0x02;

export function vp8xChunk(flags: number, width: number, height: number): Uint8Array {
  return riffChunk('VP8X', [flags, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]);
}

export const WEBP_EXIF_SECRET = 'Exif serial 123456';
export const WEBP_XMP_SECRET = '<x:xmpmeta>author</x:xmpmeta>';

export function webpExtendedFixture(width = 2, height = 3): Uint8Array {
  return webpFile(
    vp8xChunk(VP8X_ICC | VP8X_EXIF | VP8X_XMP, width, height),
    riffChunk('ICCP', 'fake-icc'),
    vp8lChunk(width, height),
    riffChunk('EXIF', WEBP_EXIF_SECRET),
    riffChunk('XMP ', WEBP_XMP_SECRET),
  );
}

export function withOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  const tiff = bytes(
    'MM\0*',
    [0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0],
    [0, 0, 0, 0],
  );
  return bytes(jpeg.subarray(0, 2), jpegSegment(0xe1, bytes('Exif\0\0', tiff)), jpeg.subarray(2));
}

export function pngBomb(width: number, height: number): Uint8Array {
  const row = new Uint8Array(1 + Math.ceil(width / 8));
  const raw = new Uint8Array(row.byteLength * height);
  return bytes(
    PNG_SIGNATURE,
    pngIhdr(width, height, 1, 0),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND'),
  );
}

export async function expectMediaError(
  promise: Promise<unknown>,
  code: string,
  status: number,
  message?: string,
) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(MediaError);
  expect(error).toMatchObject({ code, status, ...(message === undefined ? {} : { message }) });
}
