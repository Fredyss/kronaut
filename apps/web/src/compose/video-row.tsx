import { Button, Label } from '@kronaut/ui';
import { useId } from 'react';
import { useLocale } from '../context.ts';
import { m as composeText } from '../i18n/compose.ts';
import { m } from '../i18n.ts';
import { MAX_ALT_TEXT } from './media.ts';
import type { VideoSlot } from './use-media.ts';
import { isMarked, type VideoEntry, type VideoPhase } from './use-video.ts';
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
          aria-label={composeText.compose_video_progress()}
          className="h-2 w-40 accent-primary"
        />
        <span>{composeText.compose_video_uploading({ percent })}</span>
      </div>
    );
  }
  if (phase.kind === 'processing') {
    return (
      <p className="text-muted-foreground text-xs">{composeText.compose_video_processing()}</p>
    );
  }
  if (phase.kind === 'ready') {
    const { durationMs } = phase.asset;
    return (
      <p className="text-muted-foreground text-xs">
        {durationMs === null
          ? composeText.compose_video_ready()
          : composeText.compose_video_ready_duration({
              duration: formatDuration(durationMs, locale),
            })}
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
        {composeText.compose_video_retry()}
      </Button>
    </div>
  );
}

function VideoThumb({ entry, name }: { readonly entry: VideoEntry; readonly name: string }) {
  const label = composeText.compose_video_preview({ name });
  if (entry.url !== null) {
    return (
      <video
        src={entry.url}
        muted
        preload="metadata"
        aria-label={label}
        className="size-24 rounded-md bg-muted object-cover"
      />
    );
  }
  if (entry.poster === null) return <div aria-hidden className="size-24 rounded-md bg-muted" />;
  return <img src={entry.poster} alt={label} className="size-24 rounded-md object-cover" />;
}

export function VideoRow({
  video,
  disabled,
}: {
  readonly video: VideoSlot;
  readonly disabled: boolean;
}) {
  const altId = useId();
  const aiHintId = useId();
  const { entry } = video;
  const marked = isMarked(entry);
  const name = entry.file?.name ?? composeText.compose_video_existing();
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
      <VideoThumb entry={entry} name={name} />
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <p className="break-all font-medium text-sm">{name}</p>
        <PhaseStatus phase={entry.phase} disabled={disabled} onRetry={video.retry} />
        <Label htmlFor={altId}>{composeText.compose_video_alt_label()}</Label>
        <textarea
          id={altId}
          value={video.altText}
          maxLength={MAX_ALT_TEXT}
          disabled={disabled}
          rows={2}
          onChange={(event) => video.setAlt(event.currentTarget.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
        />
        <p className="text-muted-foreground text-xs">
          {composeText.compose_alt_text_hint({ count: MAX_ALT_TEXT })}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={marked || entry.aiGenerated}
            disabled={disabled || marked || entry.file === null}
            aria-describedby={aiHintId}
            onChange={(event) => video.setAi(event.currentTarget.checked)}
            className="size-4 accent-primary"
          />
          {composeText.compose_video_ai_label()}
        </label>
        <p id={aiHintId} className="text-muted-foreground text-xs">
          {marked ? composeText.compose_video_ai_marked() : composeText.compose_ai_generated_hint()}
        </p>
        {entry.aiFailed && !marked ? (
          <div role="alert" className="flex items-center gap-2 text-destructive text-sm">
            {m.compose_video_ai_failed()}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => video.setAi(true)}
            >
              {composeText.compose_video_retry()}
            </Button>
          </div>
        ) : null}
      </div>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={video.remove}>
        {m.compose_image_remove()}
      </Button>
    </div>
  );
}
