import { CorruptImageError, type Dimensions, startsWith } from './sniff-bytes.ts';
import { parseJpeg } from './sniff-jpeg.ts';
import { PNG_MAGIC, parsePng } from './sniff-png.ts';
import { parseWebp } from './sniff-webp.ts';

export { CorruptImageError } from './sniff-bytes.ts';
export type ImageFormat = 'jpeg' | 'png' | 'webp';

export const IMAGE_MIME: Readonly<Record<ImageFormat, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const SNIFF_HEAD_BYTES = 12;

export interface SniffedImage {
  readonly format: ImageFormat;
  readonly mime: string;
  readonly width: number;
  readonly height: number;
}

export type SniffResult =
  | { readonly ok: true; readonly image: SniffedImage }
  | { readonly ok: false; readonly reason: 'unsupported' | 'corrupt' };

const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const RIFF = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP = [0x57, 0x45, 0x42, 0x50] as const;

export function detectImageFormat(head: Uint8Array): ImageFormat | null {
  if (startsWith(head, 0, JPEG_MAGIC)) return 'jpeg';
  if (startsWith(head, 0, PNG_MAGIC)) return 'png';
  if (startsWith(head, 0, RIFF) && startsWith(head, 8, WEBP)) return 'webp';
  return null;
}

function dimensionsOf(bytes: Uint8Array, format: ImageFormat): Dimensions {
  if (format === 'jpeg') return parseJpeg(bytes);
  if (format === 'png') return parsePng(bytes);
  return parseWebp(bytes);
}

export function sniffImage(bytes: Uint8Array): SniffResult {
  const format = detectImageFormat(bytes);
  if (format === null) return { ok: false, reason: 'unsupported' };
  try {
    const { width, height } = dimensionsOf(bytes, format);
    return { ok: true, image: { format, mime: IMAGE_MIME[format], width, height } };
  } catch (error) {
    if (error instanceof CorruptImageError) return { ok: false, reason: 'corrupt' };
    throw error;
  }
}
