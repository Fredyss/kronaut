import { useQuery } from '@tanstack/react-query';
import { type Channel, channelMetricsQuery } from '../api.ts';
import { useApiClient, useLocale } from '../context.ts';
import { useNumberFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 365;
const CHANGE_DAYS = 30;

function useSignedFormat() {
  const { locale } = useLocale();
  const format = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' });
  return (value: number) => format.format(value);
}

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

interface FollowersProps {
  readonly workspaceId: string;
  readonly channel: Channel;
}

export function Followers({ workspaceId, channel }: FollowersProps) {
  const client = useApiClient();
  const number = useNumberFormat();
  const signed = useSignedFormat();
  const enabled = channel.status === 'active' && providerUi(channel.provider).followers === true;
  const today = Date.now();
  const range = { from: utcDay(today - WINDOW_DAYS * DAY_MS), to: utcDay(today) };
  const series = useQuery({
    ...channelMetricsQuery(client, workspaceId, channel.id, range),
    enabled,
  });
  const rows = enabled ? (series.data?.followers ?? []) : [];
  const latest = rows.at(-1);
  if (latest === undefined) return null;
  const cutoff = utcDay(today - CHANGE_DAYS * DAY_MS);
  const before = rows.filter((row) => row.day <= cutoff).at(-1)?.value ?? null;
  const change = latest.value === null || before === null ? null : latest.value - before;
  return (
    <span className="text-muted-foreground">
      {m.channels_followers({
        value: latest.value === null ? m.analytics_missing() : number(latest.value),
      })}
      {change === null ? null : ` ${m.channels_followers_change({ change: signed(change) })}`}
    </span>
  );
}
