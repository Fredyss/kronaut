import { accountPostType } from '@kronaut/compose';
import type { ImageLimits, TextCounting, VideoLimits } from '@kronaut/core';
import * as z from 'zod';
import type { ProviderEntry } from './providers.ts';

const TEXT_COUNTINGS = [
  'x-weighted',
  'mastodon',
  'threads',
  'graphemes',
  'utf16',
  'utf8-bytes',
] as const satisfies readonly TextCounting[];

const RatioSchema = z.object({ width: z.number().int(), height: z.number().int() });

const TextLimitSchema = z.object({
  counting: z.enum(TEXT_COUNTINGS),
  max: z.number().int(),
  urlWeight: z.number().int().optional(),
});

export const PostTypeRulesSchema = z.object({
  id: z.string(),
  text: z.array(TextLimitSchema),
  maxLinks: z.number().int().nullable(),
  forbiddenChars: z.string().optional(),
  imageAspect: z.object({ min: RatioSchema, max: RatioSchema }).nullable(),
  video: z
    .object({
      mimes: z.array(z.string()),
      maxBytes: z.number().int(),
      minDurationMs: z.number().int(),
      maxDurationMs: z.number().int(),
      aspect: z.object({ min: RatioSchema, max: RatioSchema }).nullable(),
      maxFrameRate: z.number().nullable(),
      maxPixels: z.number().int().nullable(),
    })
    .nullable(),
  thread: z.object({ maxItems: z.number().int() }).nullable(),
  comment: z.object({ text: z.array(TextLimitSchema) }).nullable(),
});

export const CostSchema = z.object({
  usdMicros: z.number().int(),
  linkUsdMicros: z.number().int().nullable(),
  asOf: z.string(),
  sourceUrl: z.string(),
});

function imageAspect(image: ImageLimits | undefined) {
  if (image?.minAspect === undefined || image.maxAspect === undefined) return null;
  return { min: { ...image.minAspect }, max: { ...image.maxAspect } };
}

function videoRules(video: VideoLimits | undefined) {
  if (video === undefined) return null;
  const aspect =
    video.minAspect === undefined || video.maxAspect === undefined
      ? null
      : { min: { ...video.minAspect }, max: { ...video.maxAspect } };
  const { mimes, maxBytes, minDurationMs, maxDurationMs } = video;
  return {
    mimes: [...mimes],
    maxBytes,
    minDurationMs,
    maxDurationMs,
    aspect,
    maxFrameRate: video.maxFrameRate ?? null,
    maxPixels: video.maxPixels ?? null,
  };
}

function postTypes(
  entry: ProviderEntry | undefined,
  capabilities: unknown,
): z.input<typeof PostTypeRulesSchema>[] {
  if (entry === undefined) return [];
  const { manifest } = entry;
  return manifest.postTypes.flatMap(({ id }) => {
    const postType = accountPostType(manifest, id, capabilities);
    if (postType === undefined || postType.delivery === 'unsupported') return [];
    return [
      {
        id,
        text: [...postType.text],
        maxLinks: postType.maxLinks ?? null,
        ...(postType.forbiddenChars === undefined
          ? {}
          : { forbiddenChars: postType.forbiddenChars }),
        imageAspect: imageAspect(postType.media.image),
        video: videoRules(postType.media.video),
        thread: postType.thread === undefined ? null : { maxItems: postType.thread.maxItems },
        comment: postType.comment === undefined ? null : { text: [...postType.comment.text] },
      },
    ];
  });
}

function costPerPost(entry: ProviderEntry | undefined): z.input<typeof CostSchema> | null {
  const cost = entry?.manifest.cost;
  if (cost?.model !== 'per_post' || cost.perPost === undefined) return null;
  const { usdMicros, linkUsdMicros, asOf, sourceUrl } = cost.perPost;
  return { usdMicros, linkUsdMicros: linkUsdMicros ?? null, asOf, sourceUrl };
}

export function providerRules(entry: ProviderEntry | undefined, capabilities: unknown) {
  return {
    postTypes: postTypes(entry, capabilities),
    requiredSettings: [...(entry?.manifest.requiredSettings ?? [])],
    settingOptions: entry?.manifest.accountSettingOptions?.(capabilities) ?? {},
    preview: entry?.manifest.preview ?? 'short-feed',
    manualOnly: entry?.manifest.manualOnly === true,
    cost: costPerPost(entry),
  };
}
