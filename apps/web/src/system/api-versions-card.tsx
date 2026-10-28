import { useDateFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';
import { SettingsCard } from '../settings/card.tsx';
import type { SystemStatus } from './status.ts';
import { Muted, StatusRow, type Tone } from './status-badge.tsx';

type ApiVersion = SystemStatus['apiVersions'][number];

const LEVELS: Readonly<Record<ApiVersion['level'], { tone: Tone; text(): string }>> = {
  ok: { tone: 'ok', text: () => m.system_ok() },
  warn: { tone: 'warn', text: () => m.system_api_warn() },
  critical: { tone: 'bad', text: () => m.system_api_critical() },
};

function daysText(daysLeft: number): string {
  return daysLeft < 0 ? m.system_api_ended() : m.system_api_days_left({ count: daysLeft });
}

function ApiVersionRow({ version }: { readonly version: ApiVersion }) {
  const date = useDateFormat();
  const level = LEVELS[version.level];
  const { sunsetOn, daysLeft } = version;
  return (
    <StatusRow
      title={providerUi(version.provider).name()}
      badges={[{ tone: level.tone, text: level.text() }]}
    >
      <p>{m.system_api_version({ version: version.version })}</p>
      <Muted>
        {sunsetOn === null
          ? m.system_api_no_sunset()
          : m.system_api_sunset({ date: date(sunsetOn) })}
      </Muted>
      {daysLeft === null ? null : <Muted>{daysText(daysLeft)}</Muted>}
    </StatusRow>
  );
}

export function ApiVersionsCard({ versions }: { readonly versions: SystemStatus['apiVersions'] }) {
  return (
    <SettingsCard title={m.system_api_title()}>
      {versions.map((version) => (
        <ApiVersionRow key={version.provider} version={version} />
      ))}
    </SettingsCard>
  );
}
