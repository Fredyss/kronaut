import { CheckField } from '@kronaut/ui';
import { m as integrationsText } from '../../i18n/integrations.ts';
import { GRANTABLE_SCOPES, type GrantableScope, scopeLabel } from './scopes.ts';

interface ScopeFieldProps {
  readonly scopes: ReadonlySet<GrantableScope>;
  readonly error?: string | undefined;
  onChange(scopes: ReadonlySet<GrantableScope>): void;
}

export function ScopeField({ scopes, error, onChange }: ScopeFieldProps) {
  return (
    <CheckField
      label={integrationsText.integrations_api_keys_scopes()}
      hint={integrationsText.integrations_api_keys_scopes_hint()}
      items={GRANTABLE_SCOPES.map((id) => ({ id, name: scopeLabel(id), hint: id }))}
      checked={scopes}
      error={error}
      onChange={onChange}
    />
  );
}
