import type { Post } from '../api.ts';
import { useLocale } from '../context.ts';
import { m as composeText } from '../i18n/compose.ts';
import { providerUi } from '../providers.ts';
import type { OpenedCompose } from './use-compose-form.ts';
import type { Mode } from './when.ts';

function seriesLine({ seriesId, scheduleLocal, destinations }: Post, mode: Mode): string | null {
  if (seriesId === null) return null;
  if (destinations.some((destination) => destination.state === 'scheduled')) {
    return mode === 'draft' ? composeText.compose_edit_series_skip() : null;
  }
  return scheduleLocal === null ? null : composeText.compose_edit_series_note();
}

function canceledLine(
  { post, channels, form }: OpenedCompose,
  selected: ReadonlySet<string>,
  locale: string,
): string | null {
  const names = post.destinations
    .filter((d) => form.canceled.includes(d.accountId) && !selected.has(d.accountId))
    .map(
      ({ accountId, provider }) =>
        channels.find((channel) => channel.id === accountId)?.displayName ??
        providerUi(provider).name(),
    );
  if (names.length === 0) return null;
  const list = new Intl.ListFormat(locale).format(names);
  return composeText.compose_edit_canceled_note({ channels: list });
}

export function EditNotes({
  form,
  mode,
  selected,
}: {
  readonly form: OpenedCompose;
  readonly mode: Mode;
  readonly selected: ReadonlySet<string>;
}) {
  const { locale } = useLocale();
  const queued = form.form.when.mode === 'queue' && mode === 'queue';
  const review = form.post.publishSummary === 'in_review';
  const lines = [
    queued ? composeText.compose_edit_queue_note() : null,
    review ? composeText.compose_edit_review_note() : null,
    seriesLine(form.post, mode),
    canceledLine(form, selected, locale),
  ].filter((line) => line !== null);
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-muted-foreground text-sm">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
