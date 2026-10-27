import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  MAX_CONCURRENT_REENCODES,
  MEDIA_IMAGE_MAX_PIXELS,
  ReencodeError,
  reencodeImage,
} from './reencode.ts';

const EXIF_SECRET = 'GPS owner Jane Doe';
const XMP_SECRET = 'xmp-creator-secret';
const COMMENT_SECRET = 'jpeg-comment-secret';
const PRIV_SECRET = 'private-chunk-secret';
const EXIF_CHUNK_SECRET = 'exif-chunk-secret';

function includes(haystack: Uint8Array, needle: string): boolean {
  return Buffer.from(haystack).includes(needle);
}

function solid(width: number, height: number, channels: 3 | 4 = 3) {
  return sharp({
    create: { width, height, channels, background: { r: 200, g: 40, b: 10, alpha: 1 } },
  });
}

function jpegMarkers(input: Uint8Array): number[] {
  const markers: number[] = [];
  let pos = 2;
  while (pos + 4 <= input.length && input[pos] === 0xff) {
    const marker = input[pos + 1] ?? 0;
    markers.push(marker);
    if (marker === 0xda) break;
    pos += 2 + (((input[pos + 2] ?? 0) << 8) | (input[pos + 3] ?? 0));
  }
  return markers;
}

function withComment(jpeg: Uint8Array, comment: string): Uint8Array {
  const body = Buffer.from(comment);
  const segment = Buffer.alloc(4);
  segment.writeUInt16BE(0xfffe, 0);
  segment.writeUInt16BE(body.byteLength + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), segment, body, jpeg.subarray(2)]);
}

function pngChunk(type: string, data: string): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), Buffer.from(data)]);
  const out = Buffer.alloc(body.byteLength + 8);
  out.writeUInt32BE(body.byteLength - 4, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.byteLength + 4);
  return out;
}

function pngTypes(input: Uint8Array): string[] {
  const buffer = Buffer.from(input);
  const types: string[] = [];
  let pos = 8;
  while (pos + 8 <= buffer.length) {
    types.push(buffer.toString('latin1', pos + 4, pos + 8));
    pos += 12 + buffer.readUInt32BE(pos);
  }
  return types;
}

async function animatedWebp(width: number, height: number, frames: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * frames * 3);
  for (let frame = 0; frame < frames; frame++) {
    raw.fill(frame * 60, frame * width * height * 3, (frame + 1) * width * height * 3);
  }
  return sharp(raw, { raw: { width, height: height * frames, channels: 3, pageHeight: height } })
    .webp({ effort: 0, quality: 50 })
    .toBuffer();
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

describe('reencodeImage', () => {
  it('drops EXIF GPS, XMP and comments from a JPEG', async () => {
    const tagged = await solid(32, 16)
      .jpeg()
      .withExif({
        IFD0: { ImageDescription: EXIF_SECRET },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 8/1 55/1' },
      })
      .withXmp(`<x:xmpmeta xmlns:x="adobe:ns:meta/">${XMP_SECRET}</x:xmpmeta>`)
      .toBuffer();
    const input = withComment(tagged, COMMENT_SECRET);
    for (const secret of [EXIF_SECRET, XMP_SECRET, COMMENT_SECRET]) {
      expect(includes(input, secret)).toBe(true);
    }
    expect(jpegMarkers(input)).toEqual(expect.arrayContaining([0xe1, 0xfe]));

    const out = await reencodeImage(input, 'jpeg');
    expect(out).toMatchObject({ width: 32, height: 16 });
    for (const secret of [EXIF_SECRET, XMP_SECRET, COMMENT_SECRET, 'Exif', 'ns.adobe.com']) {
      expect(includes(out.bytes, secret)).toBe(false);
    }
    expect(jpegMarkers(out.bytes).filter((m) => m >= 0xe1 && m <= 0xfe)).toEqual([]);
    const meta = await sharp(out.bytes).metadata();
    expect(meta).toMatchObject({ format: 'jpeg', width: 32, height: 16 });
    expect([meta.exif, meta.xmp, meta.icc, meta.iptc]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('converts a CMYK JPEG to 3-channel sRGB', async () => {
    const input = await solid(16, 16).toColorspace('cmyk').jpeg().toBuffer();
    expect(await sharp(input).metadata()).toMatchObject({ space: 'cmyk', channels: 4 });
    expect(jpegMarkers(input)).toContain(0xee);

    const out = await reencodeImage(input, 'jpeg');
    expect(await sharp(out.bytes).metadata()).toMatchObject({
      format: 'jpeg',
      space: 'srgb',
      channels: 3,
      width: 16,
      height: 16,
    });
    const { data } = await sharp(out.bytes).raw().toBuffer({ resolveWithObject: true });
    const [r = 0, g = 0, b = 0] = data;
    expect(r).toBeGreaterThan(150);
    expect(g).toBeLessThan(100);
    expect(b).toBeLessThan(80);
  });

  it('applies the EXIF orientation and drops the tag', async () => {
    const input = await solid(40, 20).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    expect(await sharp(input).metadata()).toMatchObject({ width: 40, height: 20, orientation: 6 });
    const out = await reencodeImage(input, 'jpeg');
    expect(out).toMatchObject({ width: 20, height: 40 });
    const meta = await sharp(out.bytes).metadata();
    expect(meta).toMatchObject({ width: 20, height: 40 });
    expect(meta.orientation).toBeUndefined();
  });

  it('drops ancillary PNG chunks whatever their case', async () => {
    const plain = await solid(6, 5, 4).png().toBuffer();
    const iend = plain.length - 12;
    const input = Buffer.concat([
      plain.subarray(0, iend),
      pngChunk('prIv', PRIV_SECRET),
      pngChunk('exIf', EXIF_CHUNK_SECRET),
      pngChunk('tEXt', `Comment\0${PRIV_SECRET}`),
      plain.subarray(iend),
    ]);
    expect(pngTypes(input)).toEqual(expect.arrayContaining(['prIv', 'exIf', 'tEXt']));

    const out = await reencodeImage(input, 'png');
    expect(out).toMatchObject({ width: 6, height: 5 });
    expect(includes(out.bytes, PRIV_SECRET)).toBe(false);
    expect(includes(out.bytes, EXIF_CHUNK_SECRET)).toBe(false);
    const kept = new Set(['IHDR', 'pHYs', 'IDAT', 'IEND']);
    expect(pngTypes(out.bytes).filter((t) => !kept.has(t))).toEqual([]);
    expect(await sharp(out.bytes).metadata()).toMatchObject({ format: 'png', channels: 4 });
  });

  it('keeps every frame of an animated WebP and reports the frame size', async () => {
    const input = await animatedWebp(24, 16, 3);
    const out = await reencodeImage(input, 'webp');
    expect(out).toMatchObject({ width: 24, height: 16 });
    expect(await sharp(out.bytes, { animated: true }).metadata()).toMatchObject({
      format: 'webp',
      width: 24,
      pages: 3,
      pageHeight: 16,
    });
  });

  it('refuses an image that claims more than the pixel limit', async () => {
    const bomb = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();
    expect(bomb.byteLength).toBeLessThan(1024 * 1024);
    const error = await rejection(reencodeImage(bomb, 'png'));
    expect(error).toBeInstanceOf(ReencodeError);
    expect(error).toMatchObject({ kind: 'too_many_pixels' });
  });

  it('counts the pixels of every animation frame against the limit', async () => {
    const width = 5000;
    const height = 3500;
    expect(width * height).toBeLessThan(MEDIA_IMAGE_MAX_PIXELS);
    expect(width * height * 3).toBeGreaterThan(MEDIA_IMAGE_MAX_PIXELS);
    const input = await animatedWebp(width, height, 3);
    const error = await rejection(reencodeImage(input, 'webp'));
    expect(error).toMatchObject({ kind: 'too_many_pixels' });
  }, 60_000);

  it('refuses bytes that do not decode', async () => {
    const png = await solid(4, 4).png().toBuffer();
    const truncated = png.subarray(0, png.length - 20);
    for (const input of [truncated, Buffer.from('not an image at all')]) {
      const error = await rejection(reencodeImage(input, 'png'));
      expect(error).toBeInstanceOf(ReencodeError);
      expect(error).toMatchObject({ kind: 'undecodable' });
    }
  });

  it('leaves the caller buffer intact', async () => {
    const input = await solid(4, 4).png().toBuffer();
    const copy = Buffer.from(input);
    await reencodeImage(input, 'png');
    expect(input.byteLength).toBe(copy.byteLength);
    expect(input.equals(copy)).toBe(true);
  });

  it('queues work beyond the concurrency limit and finishes all of it', async () => {
    const input = await solid(6, 6).png().toBuffer();
    const jobs = Array.from({ length: MAX_CONCURRENT_REENCODES * 3 }, () =>
      reencodeImage(input, 'png'),
    );
    const done = await Promise.all(jobs);
    expect(done.map((r) => [r.width, r.height])).toEqual(jobs.map(() => [6, 6]));
  });

  it('is deterministic', async () => {
    const input = await solid(12, 12).jpeg().toBuffer();
    const [first, second] = await Promise.all([
      reencodeImage(input, 'jpeg'),
      reencodeImage(input, 'jpeg'),
    ]);
    expect(first?.bytes).toEqual(second?.bytes);
  });
});
