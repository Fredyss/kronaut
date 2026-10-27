import { Button } from '@kronaut/ui';
import { useId } from 'react';
import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import type { VideoSlot } from './use-media.ts';
import { isMarked, type VideoPhase } from './use-video.ts';
import { formatDuration, rejectionText } from './video-text.ts';

function PhaseStatus({
  phase,
  disabled,
  onRetry,
}: {
  readonly phase: VideoPhase;
  readonly disabled: boolean;
  readonly onRetry: () => void;
}) {
  const { locale } = useLocale();
  if (phase.kind === 'uploading') {
    const share = phase.total === 0 ? 0 : phase.sent / phase.total;
    const percent = new Intl.NumberFormat(locale, { style: 'percent' }).format(share);
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <progress
          value={phase.sent}
          max={phase.total}
          aria-label={m.compose_video_progress()}
          className="h-2 w-40 accent-primary"
        />
        <span>{m.compose_video_uploading({ percent })}</span>
      </div>
    );
  }
  if (phase.kind === 'processing') {
    return <p className="text-muted-foreground text-xs">{m.compose_video_processing()}</p>;
  }
  if (phase.kind === 'ready') {
    const { durationMs } = phase.asset;
    return (
      <p className="text-muted-foreground text-xs">
        {durationMs === null
          ? m.compose_video_ready()
          : m.compose_video_ready_duration({ duration: formatDuration(durationMs, locale) })}
      </p>
    );
  }
  if (phase.kind === 'rejected') {
    return (
      <p role="alert" className="text-destructive text-xs">
        {rejectionText(phase.reason, locale)}
      </p>
    );
  }
  return (
    <div role="alert" className="flex items-center gap-2 text-destructive text-xs">
      <span>{m.compose_video_error()}</span>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onRetry}>
        {m.compose_video_retry()}
      </Button>
    </div>
  );
}

export function VideoRow({
  video,
  disabled,
}: {
  readonly video: VideoSlot;
  readonly disabled: boolean;
}) {
  const aiHintId = useId();
  const { entry } = video;
  const marked = isMarked(entry);
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
      <video
        src={entry.url}
        muted
        preload="metadata"
        aria-label={m.compose_video_preview({ name: entry.file.name })}
        className="size-24 rounded-md bg-muted object-cover"
      />
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <p className="break-all font-medium text-sm">{entry.file.name}</p>
        <PhaseStatus phase={entry.phase} disabled={disabled} onRetry={video.retry} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={marked || entry.aiGenerated}
            disabled={disabled || marked}
            aria-describedby={aiHintId}
            onChange={(event) => video.setAi(event.currentTarget.checked)}
            className="size-4 accent-primary"
          />
          {m.compose_video_ai_label()}
        </label>
        <p id={aiHintId} className="text-muted-foreground text-xs">
          {marked ? m.compose_video_ai_marked() : m.compose_ai_generated_hint()}
        </p>
      </div>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={video.remove}>
        {m.compose_image_remove()}
      </Button>
    </div>
  );
}
