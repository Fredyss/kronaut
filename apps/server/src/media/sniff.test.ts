import { describe, expect, it } from 'vitest';
import { detectImageFormat, sniffImage } from './sniff.ts';
import {
  bytes,
  jpegFixture,
  jpegSegment,
  PNG_SIGNATURE,
  pngChunk,
  pngFixture,
  pngIdat,
  pngIhdr,
  riffChunk,
  VP8X_ANIMATION,
  vp8Chunk,
  vp8lChunk,
  vp8xChunk,
  webpExtendedFixture,
  webpFile,
} from './testing.ts';

function sniffed(input: Uint8Array) {
  const result = sniffImage(input);
  if (!result.ok) throw new Error(`expected an image, got ${result.reason}`);
  return result.image;
}

describe('detectImageFormat', () => {
  it('recognises the allowlisted magic bytes only', () => {
    expect(detectImageFormat(jpegFixture())).toBe('jpeg');
    expect(detectImageFormat(pngFixture())).toBe('png');
    expect(detectImageFormat(webpExtendedFixture())).toBe('webp');
    expect(detectImageFormat(bytes('GIF89a', [1, 0, 1, 0]))).toBeNull();
    expect(detectImageFormat(bytes('RIFF', [0, 0, 0, 0], 'WAVE'))).toBeNull();
    expect(detectImageFormat(new Uint8Array(0))).toBeNull();
  });
});

describe('sniffImage', () => {
  it('reads JPEG dimensions from a baseline frame', () => {
    expect(sniffed(jpegFixture({ width: 17, height: 9 }))).toEqual({
      format: 'jpeg',
      mime: 'image/jpeg',
      width: 17,
      height: 9,
    });
  });

  it('reads JPEG dimensions from a progressive frame with several scans', () => {
    expect(sniffed(jpegFixture({ progressive: true, width: 640, height: 480 }))).toMatchObject({
      format: 'jpeg',
      width: 640,
      height: 480,
    });
  });

  it('reads PNG dimensions from IHDR', () => {
    expect(sniffed(pngFixture({ width: 3, height: 2 }))).toEqual({
      format: 'png',
      mime: 'image/png',
      width: 3,
      height: 2,
    });
  });

  it('reads WebP dimensions from VP8, VP8L and VP8X', () => {
    expect(sniffed(webpFile(vp8Chunk(300, 200)))).toEqual({
      format: 'webp',
      mime: 'image/webp',
      width: 300,
      height: 200,
    });
    expect(sniffed(webpFile(vp8lChunk(5, 7)))).toMatchObject({ width: 5, height: 7 });
    expect(sniffed(webpExtendedFixture(4, 6))).toMatchObject({ width: 4, height: 6 });
    const animated = webpFile(
      vp8xChunk(VP8X_ANIMATION, 640, 360),
      riffChunk('ANIM', [0, 0, 0, 0, 0, 0]),
      riffChunk('ANMF', new Uint8Array(16)),
    );
    expect(sniffed(animated)).toMatchObject({ width: 640, height: 360 });
  });

  it('ignores the declared type and rejects everything outside the allowlist', () => {
    const svg = bytes('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
    const html = bytes('<!doctype html><script>alert(1)</script>');
    const gif = bytes('GIF89a', [1, 0, 1, 0, 0, 0, 0], '<script>alert(1)</script>');
    const bomSvg = bytes([0xef, 0xbb, 0xbf], '<svg/>');
    for (const input of [svg, html, gif, bomSvg, new Uint8Array(0)]) {
      expect(sniffImage(input)).toEqual({ ok: false, reason: 'unsupported' });
    }
  });

  it('rejects truncated files', () => {
    const jpeg = jpegFixture({ width: 64, height: 64 });
    const png = pngFixture();
    const webp = webpExtendedFixture();
    const cases = [
      jpeg.subarray(0, jpeg.length - 2),
      jpeg.subarray(0, jpeg.length - 6),
      jpeg.subarray(0, 40),
      jpeg.subarray(0, 3),
      png.subarray(0, png.length - 12),
      png.subarray(0, png.length - 1),
      png.subarray(0, 20),
      png.subarray(0, 8),
      webp.subarray(0, webp.length - 4),
      webp.subarray(0, 12),
    ];
    for (const input of cases) {
      expect(sniffImage(input)).toEqual({ ok: false, reason: 'corrupt' });
    }
  });

  it('rejects inconsistent JPEG structure', () => {
    const soi = [0xff, 0xd8];
    const eoi = [0xff, 0xd9];
    const sof = (w: number, h: number, n = 1, extra: number[] = []) =>
      jpegSegment(0xc0, [8, h >> 8, h & 0xff, w >> 8, w & 0xff, n, 1, 0x11, 0, ...extra]);
    const sos = jpegSegment(0xda, [1, 1, 0, 0, 63, 0]);
    const cases = [
      bytes(soi, sof(0, 1), sos, [0x00], eoi),
      bytes(soi, sof(1, 0), sos, [0x00], eoi),
      bytes(soi, sof(1, 1, 1, [0]), sos, [0x00], eoi),
      bytes(soi, sof(1, 1, 2), sos, [0x00], eoi),
      bytes(soi, sof(1, 1), sof(1, 1), sos, [0x00], eoi),
      bytes(soi, sos, [0x00], sof(1, 1), eoi),
      bytes(soi, sof(1, 1), eoi),
      bytes(soi, sof(1, 1), jpegSegment(0xda, [2, 1, 0, 0, 63, 0]), [0x00], eoi),
      bytes(soi, sof(1, 1), [0xff, 0xd8], sos, [0x00], eoi),
      bytes(soi, sof(1, 1), [0xff, 0xd0], sos, [0x00], eoi),
      bytes(soi, sof(1, 1), [0xff, 0x01], sos, [0x00], eoi),
      bytes(soi, sof(1, 1), [0x00], sos, [0x00], eoi),
      bytes(soi, sof(1, 1), [0xff, 0xe1, 0x00, 0x01], sos, [0x00], eoi),
      bytes(soi, sof(1, 1), [0xff, 0xe1, 0xff, 0xff, 0x00], eoi),
    ];
    for (const input of cases) {
      expect(sniffImage(input)).toEqual({ ok: false, reason: 'corrupt' });
    }
  });

  it('rejects inconsistent PNG structure', () => {
    const iend = pngChunk('IEND');
    const badCrc = pngFixture();
    badCrc[29] = (badCrc[29] ?? 0) ^ 0xff;
    const cases = [
      badCrc,
      bytes(PNG_SIGNATURE, pngChunk('IHDR', new Uint8Array(12)), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(0, 1), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 0x80000000), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1, 3, 2), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1, 8, 5), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1, 8, 3), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIdat(1, 1), pngIhdr(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1), pngIhdr(1, 1), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1), pngChunk('ABCD', 'x'), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1), pngChunk('ab1d', 'x'), pngIdat(1, 1), iend),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1), pngIdat(1, 1), pngChunk('IEND', 'x')),
      bytes(PNG_SIGNATURE, pngIhdr(1, 1), pngIdat(1, 1), [0xff, 0xff, 0xff, 0xff], 'IEND'),
    ];
    for (const input of cases) {
      expect(sniffImage(input)).toEqual({ ok: false, reason: 'corrupt' });
    }
  });

  it('rejects inconsistent WebP structure', () => {
    const oversized = webpFile(vp8lChunk(1, 1));
    new DataView(oversized.buffer).setUint32(4, oversized.length, true);
    const odd = webpFile(riffChunk('VP8L', bytes([0x2f], [0, 0, 0, 0, 0])));
    new DataView(odd.buffer).setUint32(4, odd.length - 9, true);
    const versioned = vp8lChunk(1, 1);
    versioned[12] = (versioned[12] ?? 0) | 0x20;
    const cases = [
      oversized,
      odd,
      webpFile(),
      webpFile(riffChunk('ALPH', 'x')),
      webpFile(riffChunk('VP8L', bytes([0x2e], [0, 0, 0, 0]))),
      webpFile(versioned),
      webpFile(riffChunk('VP8 ', [0, 0, 0])),
      webpFile(vp8Chunk(10, 10, false)),
      webpFile(vp8Chunk(0, 10)),
      webpFile(riffChunk('VP8 ', [0x10, 0, 0, 0x9d, 0x01, 0x2b, 1, 0, 1, 0])),
      webpFile(riffChunk('VP8 ', [0x10, 0x10, 0, 0x9d, 0x01, 0x2a, 1, 0, 1, 0])),
      webpFile(vp8xChunk(0, 4, 4), vp8lChunk(4, 5)),
      webpFile(vp8xChunk(0, 4, 4)),
      webpFile(vp8xChunk(0, 4, 4), vp8lChunk(4, 4), vp8lChunk(4, 4)),
      webpFile(vp8xChunk(0, 4, 4), vp8xChunk(0, 4, 4), vp8lChunk(4, 4)),
      webpFile(riffChunk('VP8X', [0, 0, 0, 0, 3, 0, 0, 3, 0]), vp8lChunk(4, 4)),
      webpFile(vp8xChunk(0, 0x10000, 0x10000), vp8lChunk(4, 4)),
      webpFile(vp8xChunk(VP8X_ANIMATION, 4, 4), riffChunk('ANIM', [0, 0, 0, 0, 0, 0])),
      webpFile(vp8lChunk(1, 1), bytes('\0\0\0\0', [0, 0, 0, 0])),
    ];
    for (const input of cases) {
      expect(sniffImage(input)).toEqual({ ok: false, reason: 'corrupt' });
    }
  });
});
