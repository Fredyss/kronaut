import type { MediaRef, PublishContext, PublishItem } from '@kronaut/core';
import { permanent } from '../meta-graph.ts';
import { type FilePart, multipartFiles } from '../multipart.ts';
import {
  type DiscordMessageSettings,
  FILE_MAX_BYTES,
  MAX_ATTACHMENTS,
  MESSAGE_MAX_BYTES,
} from './message-spec.ts';

const SUPPRESS_NOTIFICATIONS = 1 << 12;

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

export interface MessageBody {
  readonly contentType: string;
  readonly body: string | Uint8Array;
}

interface Attachment {
  readonly id: number;
  readonly filename: string;
  readonly description?: string;
}

function extensionOf(ref: MediaRef): string {
  const extension = Object.hasOwn(EXTENSIONS, ref.mime) ? EXTENSIONS[ref.mime] : undefined;
  if (extension === undefined) throw permanent('media_type_unsupported');
  return extension;
}

export function checkMessage(item: PublishItem): void {
  if (item.text.trim() === '' && item.media.length === 0) throw permanent('text_empty');
  if (item.media.length > MAX_ATTACHMENTS) throw permanent('too_many_media');
  let total = 0;
  for (const ref of item.media) {
    extensionOf(ref);
    if (ref.bytes > FILE_MAX_BYTES) throw permanent('file_too_large');
    total += ref.bytes;
  }
  if (total > MESSAGE_MAX_BYTES) throw permanent('too_large');
}

export type MessageFields = Readonly<Record<string, unknown>>;

interface MessageParts {
  readonly item: PublishItem;
  readonly settings: DiscordMessageSettings;
  readonly extra: MessageFields;
}

function payload(
  { item, settings, extra }: MessageParts,
  attachments: readonly Attachment[],
): Record<string, unknown> {
  const parse = settings.pingEveryone ? ['users', 'roles', 'everyone'] : ['users', 'roles'];
  return {
    ...(item.text === '' ? {} : { content: item.text }),
    ...extra,
    allowed_mentions: { parse },
    ...(settings.silent ? { flags: SUPPRESS_NOTIFICATIONS } : {}),
    ...(attachments.length === 0 ? {} : { attachments }),
  };
}

function attachmentOf(ref: MediaRef, id: number): Attachment {
  const filename = `${id + 1}.${extensionOf(ref)}`;
  const altText = ref.altText ?? '';
  return altText.trim() === '' ? { id, filename } : { id, filename, description: altText };
}

export async function messageBody(
  ctx: PublishContext,
  item: PublishItem,
  settings: DiscordMessageSettings,
  extra: MessageFields = {},
): Promise<MessageBody> {
  const parts = { item, settings, extra };
  if (item.media.length === 0) {
    return { contentType: 'application/json', body: JSON.stringify(payload(parts, [])) };
  }
  const attachments: Attachment[] = [];
  const files: FilePart[] = [];
  for (const [id, ref] of item.media.entries()) {
    const attachment = attachmentOf(ref, id);
    attachments.push(attachment);
    const bytes = await ctx.media.read(ref.id);
    files.push({ name: `files[${id}]`, filename: attachment.filename, mime: ref.mime, bytes });
  }
  const json = JSON.stringify(payload(parts, attachments));
  const { type, body } = multipartFiles({ payload_json: json }, files);
  return { contentType: type, body };
}
