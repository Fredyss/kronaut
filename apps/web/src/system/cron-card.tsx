import { formatDuration } from '../compose/video-text.ts';
import { useLocale } from '../context.ts';
import { useFormat } from '../format.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { SettingsCard } from '../settings/card.tsx';
import type { SystemStatus } from './status.ts';
import { Muted, StatusRow, type Tone } from './status-badge.tsx';

type CronRun = SystemStatus['cron'][number];

function badgesOf(run: CronRun): { tone: Tone; text: string }[] {
  if (run.startedAt === null) return [{ tone: 'bad', text: settingsText.system_cron_never() }];
  const badges: { tone: Tone; text: string }[] = [];
  if (run.outcome === 'error')
    badges.push({ tone: 'bad', text: settingsText.system_cron_failed() });
  else if (run.outcome === 'ok') badges.push({ tone: 'ok', text: settingsText.system_ok() });
  else badges.push({ tone: 'neutral', text: settingsText.system_cron_running() });
  if (run.stale) badges.push({ tone: 'warn', text: settingsText.system_cron_stale() });
  return badges;
}

function CronRow({ run }: { readonly run: CronRun }) {
  const { locale } = useLocale();
  const when = useFormat(null);
  const { startedAt, finishedAt } = run;
  return (
    <StatusRow title={<code className="font-mono text-sm">{run.task}</code>} badges={badgesOf(run)}>
      {startedAt === null ? null : (
        <Muted>{settingsText.system_cron_last_run({ when: when(startedAt) })}</Muted>
      )}
      {startedAt === null || finishedAt === null ? null : (
        <Muted>
          {settingsText.system_cron_duration({
            duration: formatDuration(Date.parse(finishedAt) - Date.parse(startedAt), locale),
          })}
        </Muted>
      )}
      {run.detail === null ? null : (
        <p className="break-words font-mono text-destructive text-xs">{run.detail}</p>
      )}
    </StatusRow>
  );
}

export function CronCard({ cron }: { readonly cron: SystemStatus['cron'] }) {
  return (
    <SettingsCard title={settingsText.system_cron_title()}>
      {cron.map((run) => (
        <CronRow key={run.task} run={run} />
      ))}
    </SettingsCard>
  );
}
