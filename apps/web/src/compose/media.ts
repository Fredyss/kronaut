export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_ALT_TEXT = 1000;
export const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES: readonly string[] = ['video/mp4', 'video/quicktime', 'video/webm'];
export const MAX_VIDEO_BYTES = 300_000_000;

const THUMB_EDGE = 640;
const CHUNK = 0x8000;

export type FileProblem = 'type' | 'size';

export function fileProblem(file: File): FileProblem | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'type';
  if (file.size > MAX_IMAGE_BYTES) return 'size';
  return null;
}

export async function toBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parts: string[] = [];
  for (let start = 0; start < bytes.length; start += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(start, start + CHUNK)));
  }
  return btoa(parts.join(''));
}

// The CSP img-src has no blob:, so the preview is a small data: URL drawn from the decoded image.
export async function thumbnail(file: Blob): Promise<string | null> {
  if (typeof createImageBitmap !== 'function') return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const scale = Math.min(1, THUMB_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (context === null) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    bitmap.close();
  }
}
