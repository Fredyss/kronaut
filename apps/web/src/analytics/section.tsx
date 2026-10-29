import { type AnalyticsPostMetricsResponse, analyticsPostMetrics, type Client } from '@kronaut/sdk';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Channel, Post } from '../api.ts';
import { useApiClient } from '../context.ts';
import { useNumberFormat } from '../format.ts';
import { m } from '../i18n.ts';

export const ANALYTICS_ID = 'analytics';

type Metrics = AnalyticsPostMetricsResponse['destinations'][number];
type Metric = Metrics['snapshots'][number]['metric'];

const ORDER: readonly Metric[] = [
  'likes',
  'reposts',
  'replies',
  'quotes',
  'comments',
  'shares',
  'reactions',
  'bookmarks',
  'views',
];

interface Scope {
  readonly workspaceId: string;
  readonly postId: string;
}

function metricsQuery(client: Client, path: Scope) {
  return queryOptions({
    queryKey: ['post-metrics', path.workspaceId, path.postId],
    queryFn: async () => (await analyticsPostMetrics({ client, path })).data,
  });
}

function Missing() {
  return (
    <>
      <span aria-hidden="true">{m.analytics_missing()}</span>
      <span className="sr-only">{m.analytics_not_reported()}</span>
    </>
  );
}

interface RowProps {
  readonly row: Metrics;
  readonly channel: Channel | undefined;
  readonly format: (iso: string) => string;
}

function MetricsRow({ row, channel, format }: RowProps) {
  const number = useNumberFormat();
  const entries = ORDER.flatMap((metric) => {
    const latest = row.latest[metric];
    return latest === undefined ? [] : [{ metric, ...latest }];
  });
  const asOf = entries
    .map((entry) => entry.observedAt)
    .sort()
    .at(-1);
  return (
    <li className="flex flex-col gap-1">
      <span className="font-medium">{channel?.displayName ?? row.channelId}</span>
      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map((entry) => (
          <div key={entry.metric} className="flex gap-1">
            <dt className="text-muted-foreground">
              {m.analytics_metric({ metric: entry.metric })}
            </dt>
            <dd className="tabular-nums">
              {entry.value === null ? <Missing /> : number(entry.value)}
            </dd>
          </div>
        ))}
      </dl>
      {asOf === undefined ? null : (
        <span className="text-muted-foreground text-xs">
          {m.analytics_as_of({ when: format(asOf) })}
        </span>
      )}
    </li>
  );
}

interface SectionProps {
  readonly workspaceId: string;
  readonly post: Post;
  readonly channels: ReadonlyMap<string, Channel>;
  readonly format: (iso: string) => string;
  readonly readable: boolean;
}

export function AnalyticsSection({ workspaceId, post, channels, format, readable }: SectionProps) {
  const client = useApiClient();
  const published = post.destinations.some((destination) => destination.state === 'published');
  const metrics = useQuery({
    ...metricsQuery(client, { workspaceId, postId: post.id }),
    enabled: readable && published,
  });
  const rows = readable && published ? (metrics.data?.destinations ?? []) : [];
  const shown = rows.length > 0;
  useEffect(() => {
    if (shown && window.location.hash === `#${ANALYTICS_ID}`) {
      document.getElementById(ANALYTICS_ID)?.scrollIntoView();
    }
  }, [shown]);
  if (!shown) return null;
  return (
    <section
      id={ANALYTICS_ID}
      className="flex scroll-mt-4 flex-col gap-3 rounded-xl border p-4 text-sm"
    >
      <h2 className="font-medium">{m.analytics_title()}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <MetricsRow
            key={row.destinationId}
            row={row}
            channel={channels.get(row.channelId)}
            format={format}
          />
        ))}
      </ul>
    </section>
  );
}
