import { useNumberFormat, usePercentFormat } from '../format.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { SettingsCard } from '../settings/card.tsx';
import type { SystemStatus } from './status.ts';
import { StatusBadge } from './status-badge.tsx';

type Slo = SystemStatus['slo'];
type SloWindow = Slo['day'];
type Targets = Slo['targets'];

interface Formats {
  pct(value: number): string;
  num(value: number): string;
}

interface Metric {
  readonly label: string;
  readonly value: string;
  readonly missed: boolean | null;
}

function metrics(window: SloWindow, targets: Targets, { pct, num }: Formats): Metric[] {
  const { onTimePct, duplicates, unconfirmedPct } = window;
  return [
    {
      label: settingsText.system_slo_on_time(),
      value: onTimePct === null ? settingsText.system_no_data() : pct(onTimePct),
      missed: onTimePct === null ? null : onTimePct < targets.onTimePct,
    },
    {
      label: settingsText.system_slo_duplicates(),
      value: num(duplicates),
      missed: duplicates > targets.duplicates,
    },
    {
      label: settingsText.system_slo_unconfirmed(),
      value: unconfirmedPct === null ? settingsText.system_no_data() : pct(unconfirmedPct),
      missed: unconfirmedPct === null ? null : unconfirmedPct >= targets.unconfirmedPct,
    },
  ];
}

function WindowRow({
  label,
  window,
  targets,
}: {
  label: string;
  window: SloWindow;
  targets: Targets;
}) {
  const formats = { pct: usePercentFormat(), num: useNumberFormat() };
  return (
    <div className="flex flex-col gap-3 px-6 py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {settingsText.system_slo_total({ count: window.autoTotal })}
        </span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {metrics(window, targets, formats).map((metric) => (
          <div key={metric.label} className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{metric.label}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span
                className={
                  metric.missed === true
                    ? 'font-semibold text-destructive tabular-nums'
                    : 'font-semibold tabular-nums'
                }
              >
                {metric.value}
              </span>
              {metric.missed === null ? null : (
                <StatusBadge tone={metric.missed ? 'bad' : 'ok'}>
                  {metric.missed
                    ? settingsText.system_target_missed()
                    : settingsText.system_target_met()}
                </StatusBadge>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SloCard({ slo }: { readonly slo: Slo }) {
  const { targets } = slo;
  return (
    <SettingsCard title={settingsText.system_slo_title()}>
      <WindowRow label={settingsText.system_slo_day()} window={slo.day} targets={targets} />
      <WindowRow label={settingsText.system_slo_week()} window={slo.week} targets={targets} />
    </SettingsCard>
  );
}
