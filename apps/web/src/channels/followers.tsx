import { useQuery } from '@tanstack/react-query';
import { type Channel, channelMetricsQuery } from '../api.ts';
import { useApiClient, useLocale } from '../context.ts';
import { useNumberFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';

const DAY_MS = 86_400_000;
const CHANGE_DAYS = 30;

function useSignedFormat() {
  const { locale } = useLocale();
  const format = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' });
  return (value: number) => format.format(value);
}

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function Count({ value }: { readonly value: number | null }) {
  const number = useNumberFormat();
  if (value !== null) return m.channels_followers({ value: number(value) });
  return (
    <>
      <span aria-hidden="true">{m.channels_followers({ value: m.analytics_missing() })}</span>
      <span className="sr-only">{m.channels_followers({ value: m.analytics_not_reported() })}</span>
    </>
  );
}

interface FollowersProps {
  readonly workspaceId: string;
  readonly channel: Channel;
}

export function Followers({ workspaceId, channel }: FollowersProps) {
  const client = useApiClient();
  const signed = useSignedFormat();
  const enabled = channel.status === 'active' && providerUi(channel.provider).followers === true;
  const today = Date.now();
  const range = { from: utcDay(today - (CHANGE_DAYS - 1) * DAY_MS), to: utcDay(today) };
  const series = useQuery({
    ...channelMetricsQuery(client, workspaceId, channel.id, range),
    enabled,
  });
  const data = enabled ? series.data : undefined;
  const latest = data?.followers.at(-1) ?? data?.before;
  if (latest === undefined || latest === null) return null;
  const baseline = data?.before?.value ?? null;
  const change = latest.value === null || baseline === null ? null : latest.value - baseline;
  return (
    <span className="text-muted-foreground">
      <Count value={latest.value} />
      {change === null ? null : ` ${m.channels_followers_change({ change: signed(change) })}`}
    </span>
  );
}
