import { m } from '../i18n.ts';
import { MAX_VIDEO_BYTES } from './media.ts';
import type { VideoEntry } from './use-video.ts';
import type { RejectedReason } from './video-upload.ts';

const MIN_DURATION_MS = 3000;
const MAX_DURATION_MS = 15 * 60 * 1000;

interface DurationFormatter {
  format(duration: { readonly minutes: number; readonly seconds: number }): string;
}

type DurationFormatCtor = new (
  locale: string,
  options: { readonly style: 'short' },
) => DurationFormatter;

// Intl.DurationFormat isn't in the es2024 lib yet, and older browsers lack it.
function durationFormat(): DurationFormatCtor | undefined {
  return (Intl as unknown as { readonly DurationFormat?: DurationFormatCtor }).DurationFormat;
}

export function formatDuration(ms: number, locale: string): string {
  const total = Math.round(ms / 1000);
  const Format = durationFormat();
  if (Format !== undefined) {
    const minutes = Math.floor(total / 60);
    return new Format(locale, { style: 'short' }).format({ minutes, seconds: total % 60 });
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'second',
    maximumFractionDigits: 0,
  }).format(total);
}

export function formatMegabytes(bytes: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 0,
  }).format(bytes / 1_000_000);
}

export function rejectionText(reason: RejectedReason, locale: string): string {
  switch (reason) {
    case 'video_stream_missing':
      return m.compose_video_rejected_stream_missing();
    case 'video_too_short':
      return m.compose_video_rejected_too_short({ min: formatDuration(MIN_DURATION_MS, locale) });
    case 'video_too_long':
      return m.compose_video_rejected_too_long({ max: formatDuration(MAX_DURATION_MS, locale) });
    case 'video_too_large':
      return m.compose_video_rejected_too_large({ max: formatMegabytes(MAX_VIDEO_BYTES, locale) });
    case 'video_unreadable':
      return m.compose_video_rejected_unreadable();
    case 'video_duplicate':
      return m.compose_video_error();
  }
}

export function waitProblem(entry: VideoEntry | undefined, locale: string): string | null {
  const phase = entry?.phase ?? { kind: 'processing' };
  if (phase.kind === 'ready') {
    if (entry === undefined || !entry.aiGenerated || phase.asset.aiGenerated) return null;
    return entry.aiFailed ? m.compose_video_ai_failed() : m.compose_video_ai_saving();
  }
  if (phase.kind === 'rejected') return rejectionText(phase.reason, locale);
  if (phase.kind === 'error') return m.compose_video_error();
  return m.compose_video_wait();
}
