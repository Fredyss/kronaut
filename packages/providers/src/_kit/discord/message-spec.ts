import type { PostTypeSpec } from '@kronaut/core';
import * as z from 'zod';

export const discordMessageSettings = z.object({
  silent: z.boolean().default(false),
  pingEveryone: z.boolean().default(false),
});
export type DiscordMessageSettings = z.infer<typeof discordMessageSettings>;

const MIB = 1024 * 1024;
export const FILE_MAX_BYTES = 20 * MIB;
export const MESSAGE_MAX_BYTES = 25 * MIB;
export const MAX_ATTACHMENTS = 10;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const VIDEO_MIME = 'video/mp4';

export const SEND_MESSAGE_STEP = 'send_message';

export const DISCORD_MESSAGE: PostTypeSpec = {
  id: 'message',
  delivery: 'api',
  steps: [{ id: SEND_MESSAGE_STEP, effect: 'public' }],
  text: [{ counting: 'utf16', max: 2_000 }],
  media: {
    minCount: 0,
    maxCount: MAX_ATTACHMENTS,
    image: { mimes: IMAGE_MIMES, maxBytes: FILE_MAX_BYTES },
    video: {
      mimes: [VIDEO_MIME],
      maxBytes: FILE_MAX_BYTES,
      minDurationMs: 0,
      maxDurationMs: Number.MAX_SAFE_INTEGER,
    },
    mixed: true,
    altText: { supported: true, required: false, maxLength: 1_024 },
    aiLabel: false,
  },
};
