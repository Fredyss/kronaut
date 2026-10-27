import type { PostTypeSpec } from '@kronaut/core';
import * as z from 'zod';

const IMAGE_MIME = /^image\/[a-z0-9.+-]+$/;
const OUT_OF_SCOPE_MIMES: ReadonlySet<string> = new Set(['image/gif']);

const size = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger)
  .optional()
  .catch(undefined);

const stored = z.looseObject({
  instance: z
    .looseObject({
      maxCharacters: size,
      maxMediaAttachments: size,
      charactersReservedPerUrl: size,
      supportedMimeTypes: z.array(z.string()).max(200).optional().catch(undefined),
      imageSizeLimit: size,
      descriptionLimit: size,
    })
    .optional()
    .catch(undefined),
});

function imageMimes(supported: readonly string[] | undefined, fallback: readonly string[]) {
  if (supported === undefined) return fallback;
  return supported.filter((mime) => IMAGE_MIME.test(mime) && !OUT_OF_SCOPE_MIMES.has(mime));
}

export function accountPostType(postType: PostTypeSpec, capabilities: unknown): PostTypeSpec {
  const parsed = stored.safeParse(capabilities);
  const limits = parsed.success ? parsed.data.instance : undefined;
  if (limits === undefined) return postType;
  const { media } = postType;
  return {
    ...postType,
    text: postType.text.map((limit) =>
      limit.counting === 'mastodon'
        ? {
            ...limit,
            max: limits.maxCharacters ?? limit.max,
            ...(limits.charactersReservedPerUrl === undefined
              ? {}
              : { urlWeight: limits.charactersReservedPerUrl }),
          }
        : limit,
    ),
    media: {
      ...media,
      maxCount: limits.maxMediaAttachments ?? media.maxCount,
      ...(media.image === undefined
        ? {}
        : {
            image: {
              ...media.image,
              mimes: imageMimes(limits.supportedMimeTypes, media.image.mimes),
              maxBytes: limits.imageSizeLimit ?? media.image.maxBytes,
            },
          }),
      altText: { ...media.altText, maxLength: limits.descriptionLimit ?? media.altText.maxLength },
    },
  };
}
