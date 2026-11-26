import { Button, ConfirmDelete } from '@kronaut/ui';
import { useState } from 'react';
import { useLocale } from '../../base/locale/context.ts';
import { useFormat } from '../../base/locale/format.ts';
import { m as integrationsText } from '../../i18n/integrations.ts';
import { type ApiKey, DEFAULT_RATE_LIMIT } from './queries.ts';
import { scopeLabel } from './scopes.ts';
import { useRevokeApiKey } from './writes.ts';

const STATUS: Readonly<Record<ApiKey['status'], () => string>> = {
  active: () => integrationsText.integrations_api_keys_status_active(),
  expired: () => integrationsText.integrations_api_keys_status_expired(),
  revoked: () => integrationsText.integrations_api_keys_status_revoked(),
};

function reachText(key: ApiKey, list: Intl.ListFormat): string {
  if (key.resourceScope === 'workspace' || key.access === null) {
    return integrationsText.integrations_api_keys_whole_workspace();
  }
  const parts = [
    key.access.brandIds.length === 0
      ? null
      : integrationsText.integrations_api_keys_brand_count({ count: key.access.brandIds.length }),
    key.access.accountIds.length === 0
      ? null
      : integrationsText.integrations_api_keys_channel_count({
          count: key.access.accountIds.length,
        }),
  ].filter((part) => part !== null);
  return parts.length === 0
    ? integrationsText.integrations_api_keys_restricted_nothing()
    : integrationsText.integrations_api_keys_restricted({ reach: list.format(parts) });
}

function rateText(key: ApiKey): string {
  return key.rateLimitPerMinute === null
    ? integrationsText.integrations_api_keys_rate_default({ count: DEFAULT_RATE_LIMIT })
    : integrationsText.integrations_api_keys_rate({ count: key.rateLimitPerMinute });
}

function useTimes(key: ApiKey): string[] {
  const when = useFormat(null);
  const expiry =
    key.expiresAt === null
      ? integrationsText.integrations_api_keys_never_expires()
      : key.status === 'expired'
        ? integrationsText.integrations_api_keys_expired_at({ time: when(key.expiresAt) })
        : integrationsText.integrations_api_keys_expires({ time: when(key.expiresAt) });
  const revoked =
    key.revokedAt === null
      ? null
      : integrationsText.integrations_api_keys_revoked_at({ time: when(key.revokedAt) });
  return [
    revoked ?? expiry,
    integrationsText.integrations_api_keys_created_at({ time: when(key.createdAt) }),
  ];
}

function Details({ apiKey }: { readonly apiKey: ApiKey }) {
  const { locale } = useLocale();
  const list = new Intl.ListFormat(locale);
  const times = useTimes(apiKey);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="truncate font-medium">{apiKey.name}</span>
        <span className="text-muted-foreground">{STATUS[apiKey.status]()}</span>
      </span>
      <span className="text-muted-foreground">{list.format(apiKey.scopes.map(scopeLabel))}</span>
      <span className="text-muted-foreground">
        {[
          reachText(apiKey, list),
          rateText(apiKey),
          apiKey.tokenPrefix === null
            ? null
            : integrationsText.integrations_api_keys_prefix({ prefix: apiKey.tokenPrefix }),
        ]
          .filter((part) => part !== null)
          .join(' · ')}
      </span>
      <span className="text-muted-foreground">{times.join(' · ')}</span>
    </div>
  );
}

interface KeyRowProps {
  readonly workspaceId: string;
  readonly apiKey: ApiKey;
}

export function KeyRow({ workspaceId, apiKey }: KeyRowProps) {
  const revoke = useRevokeApiKey(workspaceId, apiKey.id);
  const [asking, setAsking] = useState(false);
  const live = apiKey.status === 'active';
  return (
    <li
      className={`flex flex-wrap items-center gap-3 px-6 py-3 ${live ? '' : 'text-muted-foreground opacity-70'}`}
    >
      <Details apiKey={apiKey} />
      {apiKey.status === 'revoked' ? null : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={integrationsText.integrations_api_keys_revoke_named({ name: apiKey.name })}
          onClick={() => setAsking(true)}
        >
          {integrationsText.integrations_api_keys_revoke()}
        </Button>
      )}
      {asking ? (
        <ConfirmDelete
          title={integrationsText.integrations_api_keys_revoke_title()}
          body={integrationsText.integrations_api_keys_revoke_body()}
          keepLabel={integrationsText.integrations_api_keys_keep()}
          confirmLabel={integrationsText.integrations_api_keys_revoke()}
          pending={revoke.isPending}
          onCancel={() => setAsking(false)}
          onConfirm={() => revoke.mutate(undefined, { onSettled: () => setAsking(false) })}
        />
      ) : null}
    </li>
  );
}
