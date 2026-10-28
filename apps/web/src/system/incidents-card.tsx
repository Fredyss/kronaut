import { useFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';
import { SettingsCard } from '../settings/card.tsx';
import type { SystemStatus } from './status.ts';
import { Muted, StatusRow } from './status-badge.tsx';

type Incident = SystemStatus['incidents'][number];

function kindLabel(kind: string): string {
  switch (kind) {
    case 'app_credentials_invalid':
      return m.system_incident_app_credentials_invalid();
    case 'app_suspended':
      return m.system_incident_app_suspended();
    case 'tier_not_enrolled':
      return m.system_incident_tier_not_enrolled();
    case 'rate_limited_app':
      return m.system_incident_rate_limited_app();
    case 'provider_outage':
      return m.system_incident_provider_outage();
    default:
      return kind;
  }
}

function IncidentRow({ incident }: { readonly incident: Incident }) {
  const when = useFormat(null);
  const { resolvedAt } = incident;
  const badge =
    resolvedAt === null
      ? { tone: 'bad' as const, text: m.system_incident_open() }
      : { tone: 'ok' as const, text: m.system_incident_resolved({ when: when(resolvedAt) }) };
  return (
    <StatusRow title={providerUi(incident.provider).name()} badges={[badge]}>
      <p>{kindLabel(incident.kind)}</p>
      <Muted>
        {m.system_incident_seen({
          first: when(incident.openedAt),
          last: when(incident.lastSeenAt),
        })}
      </Muted>
      <Muted>{m.system_incident_occurrences({ count: incident.occurrences })}</Muted>
    </StatusRow>
  );
}

export function IncidentsCard({ incidents }: { readonly incidents: SystemStatus['incidents'] }) {
  return (
    <SettingsCard title={m.system_incidents_title()}>
      {incidents.length === 0 ? (
        <p className="px-6 py-4 text-muted-foreground text-sm">{m.system_incidents_empty()}</p>
      ) : (
        incidents.map((incident) => (
          <IncidentRow
            key={`${incident.provider}-${incident.kind}-${incident.openedAt}`}
            incident={incident}
          />
        ))
      )}
    </SettingsCard>
  );
}
