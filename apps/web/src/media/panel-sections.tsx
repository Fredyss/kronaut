import { Button, Label } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { errorCode } from '../api.ts';
import { formatDuration } from '../compose/video-text.ts';
import { useApiClient, useLocale } from '../context.ts';
import { useFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { summaryLabel } from '../post-summary.ts';
import { formatBytes, kindLabel } from './format.ts';
import { type LibraryAsset, type UsagePost, usageQuery } from './queries.ts';
import { AiBadge } from './tile.tsx';
import type { AssetActions } from './use-asset-actions.ts';

export const ALT_TEXT_MAX = 1500;

interface SectionProps {
  readonly asset: LibraryAsset;
  readonly actions: AssetActions;
}

export function Details({ asset }: { readonly asset: LibraryAsset }) {
  const { locale } = useLocale();
  const format = useFormat(null);
  const number = new Intl.NumberFormat(locale);
  const rows: [string, string][] = [[m.media_type(), asset.mime ?? kindLabel(asset)]];
  if (asset.bytes !== null) rows.push([m.media_size(), formatBytes(asset.bytes, locale)]);
  if (asset.width !== null && asset.height !== null) {
    const width = number.format(asset.width);
    const height = number.format(asset.height);
    rows.push([m.media_dimensions(), m.media_dimensions_value({ width, height })]);
  }
  if (asset.durationMs !== null) {
    rows.push([m.media_duration(), formatDuration(asset.durationMs, locale)]);
  }
  rows.push([m.media_uploaded(), format(asset.createdAt)]);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AltTextForm({ asset, actions }: SectionProps) {
  const [value, setValue] = useState(asset.altText ?? '');
  const id = useId();
  const hintId = useId();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        actions.alt.mutate(value);
      }}
    >
      <Label htmlFor={id}>{m.media_alt_label()}</Label>
      <textarea
        id={id}
        value={value}
        maxLength={ALT_TEXT_MAX}
        rows={3}
        aria-describedby={hintId}
        onChange={(event) => setValue(event.currentTarget.value)}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
      />
      <p id={hintId} className="text-muted-foreground text-xs">
        {m.media_alt_hint({ count: ALT_TEXT_MAX })}
      </p>
      <Button
        type="submit"
        size="sm"
        className="self-start"
        disabled={actions.alt.isPending || value === (asset.altText ?? '')}
      >
        {m.media_alt_save()}
      </Button>
    </form>
  );
}

export function AiLabel({ asset, actions }: SectionProps) {
  if (!asset.aiGenerated) return null;
  const refused = actions.clearAi.isError && errorCode(actions.clearAi.error) === 'conflict';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <AiBadge />
        <Button
          size="sm"
          variant="outline"
          disabled={actions.clearAi.isPending}
          onClick={() => actions.clearAi.mutate()}
        >
          {m.media_ai_remove()}
        </Button>
      </div>
      {refused ? (
        <p role="alert" className="text-destructive text-sm">
          {m.media_ai_locked()}
        </p>
      ) : null}
    </div>
  );
}

function UsageRow({ post }: { readonly post: UsagePost }) {
  const format = useFormat(null);
  const label = post.title ?? (post.excerpt === '' ? m.media_usage_untitled() : post.excerpt);
  return (
    <li className="flex flex-col">
      <Link
        to="/posts/$postId"
        params={{ postId: post.postId }}
        className="truncate font-medium underline-offset-4 hover:underline"
      >
        {label}
      </Link>
      <span className="text-muted-foreground text-xs">
        {summaryLabel(post.publishSummary)}
        {post.scheduledAt === null
          ? null
          : ` · ${m.media_usage_scheduled({ when: format(post.scheduledAt) })}`}
      </span>
    </li>
  );
}

export function Usage({ workspaceId, mediaId }: { workspaceId: string; mediaId: string }) {
  const client = useApiClient();
  const usage = useQuery(usageQuery(client, workspaceId, mediaId));
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium text-sm">{m.media_usage_title()}</h3>
      {usage.isError ? <p className="text-destructive text-sm">{m.error_generic()}</p> : null}
      {usage.data === undefined ? null : usage.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.media_usage_none()}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {usage.data.map((post) => (
            <UsageRow key={post.postId} post={post} />
          ))}
        </ul>
      )}
    </section>
  );
}
