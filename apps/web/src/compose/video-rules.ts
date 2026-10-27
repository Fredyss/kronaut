import type { ValidationIssue } from '@kronaut/compose/text';
import type { Channel } from '../api.ts';
import { m } from '../i18n.ts';
import { formatDuration, formatMegabytes } from './video-text.ts';

export type VideoRules = NonNullable<Channel['postTypes'][number]['video']>;

export interface VideoMeta {
  readonly mime: string | null;
  readonly bytes: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly durationMs: number | null;
}

type Aspect = NonNullable<VideoRules['aspect']>;

function outside(width: number, height: number, { min, max }: Aspect): boolean {
  return width * min.height < min.width * height || width * max.height > max.width * height;
}

function fileIssues(rules: VideoRules, { mime, bytes }: VideoMeta): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (mime !== null && !rules.mimes.includes(mime)) issues.push({ code: 'mime_unsupported' });
  if (bytes !== null && bytes > rules.maxBytes) {
    issues.push({ code: 'file_too_large', limit: rules.maxBytes, actual: bytes });
  }
  return issues;
}

function shapeIssues(rules: VideoRules, video: VideoMeta): ValidationIssue[] {
  const { width, height, durationMs } = video;
  const { aspect } = rules;
  const issues: ValidationIssue[] = [];
  if (durationMs === null || (aspect !== null && (width === null || height === null))) {
    issues.push({ code: 'media_metadata_missing' });
  }
  if (aspect !== null && width !== null && height !== null && outside(width, height, aspect)) {
    issues.push({ code: 'aspect_out_of_range' });
  }
  if (durationMs !== null && durationMs < rules.minDurationMs) {
    issues.push({ code: 'duration_too_short', limit: rules.minDurationMs, actual: durationMs });
  }
  if (durationMs !== null && durationMs > rules.maxDurationMs) {
    issues.push({ code: 'duration_too_long', limit: rules.maxDurationMs, actual: durationMs });
  }
  return issues;
}

export function checkVideo(rules: VideoRules | null, video: VideoMeta): ValidationIssue[] {
  if (rules === null) return [{ code: 'media_kind_unsupported' }];
  return [...fileIssues(rules, video), ...shapeIssues(rules, video)];
}

export function videoIssueLine(issue: ValidationIssue, channel: string, locale: string): string {
  const limit = issue.limit ?? 0;
  switch (issue.code) {
    case 'mime_unsupported':
      return m.compose_video_issue_mime({ channel });
    case 'file_too_large':
      return m.compose_video_issue_too_large({ channel, max: formatMegabytes(limit, locale) });
    case 'aspect_out_of_range':
      return m.compose_video_issue_aspect({ channel });
    case 'duration_too_short':
      return m.compose_video_issue_too_short({ channel, min: formatDuration(limit, locale) });
    case 'duration_too_long':
      return m.compose_video_issue_too_long({ channel, max: formatDuration(limit, locale) });
    case 'media_metadata_missing':
      return m.compose_video_issue_metadata({ channel });
    default:
      return m.compose_video_issue_kind({ channel });
  }
}
