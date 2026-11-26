import { CheckList } from '../../base/ui/check-list.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { GRANTABLE_SCOPES, type GrantableScope, isGrantableScope, scopeLabel } from './scopes.ts';

interface ScopeFieldProps {
  readonly scopes: ReadonlySet<GrantableScope>;
  readonly error?: string | undefined;
  onChange(scopes: ReadonlySet<GrantableScope>): void;
}

export function ScopeField({ scopes, error, onChange }: ScopeFieldProps) {
  const items = GRANTABLE_SCOPES.map((id) => ({ id, name: scopeLabel(id), hint: id }));
  const toggle = (id: string, on: boolean) => {
    if (!isGrantableScope(id)) return;
    const next = new Set(scopes);
    if (on) next.add(id);
    else next.delete(id);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm">{settingsText.settings_api_keys_scopes()}</span>
      <p className="text-muted-foreground text-sm">
        {settingsText.settings_api_keys_scopes_hint()}
      </p>
      <CheckList
        label={settingsText.settings_api_keys_scopes()}
        items={items}
        checked={scopes}
        onToggle={toggle}
      />
      {error === undefined ? null : <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
