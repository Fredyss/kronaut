import { type Client, mediaUpload } from '@kronaut/sdk';
import { distinctImages } from './contents.ts';
import { toBase64 } from './media.ts';
import type { ComposeImage, ComposeInput } from './submit.ts';
import {
  type FailedImage,
  MarkedImageError,
  SubmitError,
  type SubmitTarget,
} from './submit-error.ts';

interface UploadEntry {
  readonly key: string;
  uploaded: { readonly id: string; readonly marked: boolean } | null;
}

export type UploadCache = Map<string, UploadEntry>;

interface MediaTarget {
  readonly client: Client;
  readonly workspaceId: string;
  readonly uploads: UploadCache;
}

type NewImage = ComposeImage & { readonly file: File };

async function send(s: MediaTarget, image: NewImage, key: string) {
  const filename = image.file.name === '' ? {} : { filename: image.file.name.slice(0, 255) };
  const { data } = await mediaUpload({
    client: s.client,
    path: { workspaceId: s.workspaceId },
    body: {
      ...filename,
      dataBase64: await toBase64(image.file),
      ...(image.aiGenerated ? { aiGenerated: true } : {}),
    },
    headers: { 'Idempotency-Key': key },
  });
  return { id: data.id, marked: data.aiGenerated };
}

async function upload(
  s: MediaTarget,
  image: NewImage,
  failed: FailedImage,
  targets: readonly SubmitTarget[],
) {
  const cacheKey = image.aiGenerated ? `${image.id}:ai` : image.id;
  const entry = s.uploads.get(cacheKey) ?? { key: crypto.randomUUID(), uploaded: null };
  s.uploads.set(cacheKey, entry);
  try {
    entry.uploaded ??= await send(s, image, entry.key);
  } catch (error) {
    throw new SubmitError('upload', error, targets, failed);
  }
  if (entry.uploaded.marked && !image.aiGenerated) {
    throw new SubmitError('upload', new MarkedImageError(), targets, failed);
  }
  return entry.uploaded.id;
}

export async function uploadMedia(
  s: MediaTarget,
  input: ComposeInput,
  targets: readonly SubmitTarget[],
) {
  const ids = new Map<string, string>();
  const lists = [input.content, ...input.variants].map((content) => content.images);
  for (const { image, content, index } of distinctImages(lists)) {
    const { file } = image;
    const variant = content === 0 ? null : content - 1;
    const id =
      file === null ? image.id : await upload(s, { ...image, file }, { index, variant }, targets);
    ids.set(image.id, id);
  }
  return ids;
}
