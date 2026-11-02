import { detectImageFormat, IMAGE_MIME } from './sniff.ts';
import { startsWith } from './sniff-bytes.ts';

export const MP4_MIME = 'video/mp4';
export const WEBM_MIME = 'video/webm';

const FTYP = [0x66, 0x74, 0x79, 0x70] as const;
const EBML = [0x1a, 0x45, 0xdf, 0xa3] as const;

export function isMp4(head: Uint8Array): boolean {
  return startsWith(head, 4, FTYP);
}

export function isWebm(head: Uint8Array): boolean {
  return startsWith(head, 0, EBML);
}

export function detectServedMime(head: Uint8Array): string | null {
  if (isMp4(head)) return MP4_MIME;
  const image = detectImageFormat(head);
  return image === null ? null : IMAGE_MIME[image];
}
