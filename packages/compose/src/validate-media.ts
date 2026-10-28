import type { ImageLimits, MediaLimits, Ratio, VideoLimits } from '@kronaut/core';
import { countText } from './count.ts';
import type { DraftItem, DraftMedia, ValidationIssue } from './validate.ts';

function aspectBelowMin(width: number, height: number, min: Ratio): boolean {
  return width * min.height < min.width * height;
}

function aspectAboveMax(width: number, height: number, max: Ratio): boolean {
  return width * max.height > max.width * height;
}

interface MediaAt {
  readonly itemIndex: number;
  readonly mediaIndex: number;
}

function validateAspect(
  media: DraftMedia,
  limits: ImageLimits | VideoLimits,
  at: MediaAt,
  issues: ValidationIssue[],
): void {
  const { width, height } = media;
  if (width === undefined || height === undefined) {
    return;
  }
  const { minAspect, maxAspect } = limits;
  if (
    (minAspect !== undefined && aspectBelowMin(width, height, minAspect)) ||
    (maxAspect !== undefined && aspectAboveMax(width, height, maxAspect))
  ) {
    issues.push({ code: 'aspect_out_of_range', ...at });
  }
}

function validateImage(
  media: DraftMedia,
  limits: ImageLimits,
  at: MediaAt,
  issues: ValidationIssue[],
): void {
  const { width, height } = media;
  const dimensionLimited =
    limits.minWidth !== undefined ||
    limits.maxWidth !== undefined ||
    limits.minAspect !== undefined ||
    limits.maxAspect !== undefined;
  if (dimensionLimited && (width === undefined || height === undefined)) {
    issues.push({ code: 'media_metadata_missing', ...at });
  }
  if (width !== undefined) {
    if (limits.minWidth !== undefined && width < limits.minWidth) {
      issues.push({ code: 'image_too_narrow', ...at, limit: limits.minWidth, actual: width });
    }
    if (limits.maxWidth !== undefined && width > limits.maxWidth) {
      issues.push({ code: 'image_too_wide', ...at, limit: limits.maxWidth, actual: width });
    }
  }
  validateAspect(media, limits, at, issues);
}

function validateResolution(
  media: DraftMedia,
  maxPixels: number | undefined,
  at: MediaAt,
  issues: ValidationIssue[],
): void {
  const { width, height } = media;
  if (maxPixels === undefined || width === undefined || height === undefined) return;
  const actual = width * height;
  if (actual > maxPixels)
    issues.push({ code: 'resolution_too_high', ...at, limit: maxPixels, actual });
}

function validateVideo(
  media: DraftMedia,
  limits: VideoLimits,
  at: MediaAt,
  issues: ValidationIssue[],
): void {
  const { width, height, durationMs } = media;
  const shapeLimited =
    limits.minAspect !== undefined ||
    limits.maxAspect !== undefined ||
    limits.maxPixels !== undefined;
  if (durationMs === undefined || (shapeLimited && (width === undefined || height === undefined))) {
    issues.push({ code: 'media_metadata_missing', ...at });
  }
  validateAspect(media, limits, at, issues);
  validateResolution(media, limits.maxPixels, at, issues);
  if (durationMs !== undefined) {
    if (durationMs < limits.minDurationMs) {
      issues.push({
        code: 'duration_too_short',
        ...at,
        limit: limits.minDurationMs,
        actual: durationMs,
      });
    }
    if (durationMs > limits.maxDurationMs) {
      issues.push({
        code: 'duration_too_long',
        ...at,
        limit: limits.maxDurationMs,
        actual: durationMs,
      });
    }
  }
}

function validateAltText(
  media: DraftMedia,
  altText: MediaLimits['altText'],
  at: MediaAt,
  issues: ValidationIssue[],
): void {
  if (!altText.supported) {
    return;
  }
  const alt = media.altText;
  if (altText.required && (alt === undefined || alt.trim() === '')) {
    issues.push({ code: 'alt_text_required', ...at });
  }
  if (alt !== undefined) {
    const actual = countText(alt, 'graphemes');
    if (actual > altText.maxLength) {
      issues.push({ code: 'alt_text_too_long', ...at, limit: altText.maxLength, actual });
    }
  }
}

function validateFile(
  media: DraftMedia,
  limits: ImageLimits | VideoLimits,
  at: MediaAt,
  issues: ValidationIssue[],
): void {
  if (!limits.mimes.includes(media.mime)) {
    issues.push({ code: 'mime_unsupported', ...at });
  }
  if (media.bytes > limits.maxBytes) {
    issues.push({ code: 'file_too_large', ...at, limit: limits.maxBytes, actual: media.bytes });
  }
}

function validateMediaFile(
  media: DraftMedia,
  limits: MediaLimits,
  at: MediaAt,
  issues: ValidationIssue[],
): void {
  if (media.kind === 'image') {
    if (limits.image === undefined) {
      issues.push({ code: 'media_kind_unsupported', ...at });
      return;
    }
    validateFile(media, limits.image, at, issues);
    validateImage(media, limits.image, at, issues);
  } else {
    if (limits.video === undefined) {
      issues.push({ code: 'media_kind_unsupported', ...at });
      return;
    }
    validateFile(media, limits.video, at, issues);
    validateVideo(media, limits.video, at, issues);
  }
  validateAltText(media, limits.altText, at, issues);
}

export function validateItemMedia(
  item: DraftItem,
  itemIndex: number,
  limits: MediaLimits,
  issues: ValidationIssue[],
): void {
  if (item.role === 'comment') {
    if (item.media.length > 0) {
      issues.push({ code: 'media_not_allowed', itemIndex });
    }
    return;
  }
  const count = item.media.length;
  if (count < limits.minCount) {
    issues.push({ code: 'too_few_media', itemIndex, limit: limits.minCount, actual: count });
  }
  if (count > limits.maxCount) {
    issues.push({ code: 'too_many_media', itemIndex, limit: limits.maxCount, actual: count });
  }
  if (!limits.mixed) {
    const hasImage = item.media.some((media) => media.kind === 'image');
    const hasVideo = item.media.some((media) => media.kind === 'video');
    if (hasImage && hasVideo) {
      issues.push({ code: 'mixed_media_unsupported', itemIndex });
    }
  }
  item.media.forEach((media, mediaIndex) => {
    validateMediaFile(media, limits, { itemIndex, mediaIndex }, issues);
  });
}
