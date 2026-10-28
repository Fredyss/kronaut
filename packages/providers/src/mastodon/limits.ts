import type { MediaLimits, PostTypeSpec, VideoLimits } from '@kronaut/core';
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
      videoSizeLimit: size,
      videoFrameRateLimit: size,
      videoMatrixLimit: size,
      descriptionLimit: size,
    })
    .optional()
    .catch(undefined),
});
type Limits = NonNullable<z.infer<typeof stored>['instance']>;

function imageMimes(supported: readonly string[] | undefined, fallback: readonly string[]) {
  if (supported === undefined) return fallback;
  return supported.filter((mime) => IMAGE_MIME.test(mime) && !OUT_OF_SCOPE_MIMES.has(mime));
}

function videoLimits(video: VideoLimits, limits: Limits): VideoLimits {
  const { supportedMimeTypes } = limits;
  return {
    ...video,
    mimes:
      supportedMimeTypes === undefined
        ? video.mimes
        : video.mimes.filter((mime) => supportedMimeTypes.includes(mime)),
    maxBytes: limits.videoSizeLimit ?? video.maxBytes,
    ...(video.maxFrameRate === undefined && limits.videoFrameRateLimit === undefined
      ? {}
      : { maxFrameRate: limits.videoFrameRateLimit ?? video.maxFrameRate }),
    ...(video.maxPixels === undefined && limits.videoMatrixLimit === undefined
      ? {}
      : { maxPixels: limits.videoMatrixLimit ?? video.maxPixels }),
  };
}

function mediaLimits(media: MediaLimits, limits: Limits): MediaLimits {
  const maxCount = limits.maxMediaAttachments ?? media.maxCount;
  return {
    ...media,
    maxCount: media.video === undefined ? maxCount : Math.min(maxCount, media.maxCount),
    ...(media.image === undefined
      ? {}
      : {
          image: {
            ...media.image,
            mimes: imageMimes(limits.supportedMimeTypes, media.image.mimes),
            maxBytes: limits.imageSizeLimit ?? media.image.maxBytes,
          },
        }),
    ...(media.video === undefined ? {} : { video: videoLimits(media.video, limits) }),
    altText: { ...media.altText, maxLength: limits.descriptionLimit ?? media.altText.maxLength },
  };
}

export function accountPostType(postType: PostTypeSpec, capabilities: unknown): PostTypeSpec {
  const parsed = stored.safeParse(capabilities);
  const limits = parsed.success ? parsed.data.instance : undefined;
  if (limits === undefined) return postType;
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
    media: mediaLimits(postType.media, limits),
  };
}
