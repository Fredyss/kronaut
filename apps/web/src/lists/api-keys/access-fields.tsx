import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { providerUi } from '../../base/providers/ui.ts';
import { CheckList } from '../../base/ui/check-list.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { activeBrands, brandsQuery } from '../../records/brands/queries.ts';
import { channelsQuery } from '../../records/channels/queries.ts';
import type { Access } from './draft.ts';

interface Item {
  readonly id: string;
  readonly name: string;
  readonly hint?: string;
}

function toggled(current: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
  return new Set(on ? [...current, id] : [...current].filter((other) => other !== id));
}

function Picker({
  label,
  empty,
  items,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly empty: string;
  readonly items: readonly Item[];
  readonly checked: ReadonlySet<string>;
  onChange(next: ReadonlySet<string>): void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm">{label}</span>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <CheckList
          label={label}
          items={items}
          checked={checked}
          onToggle={(id, on) => onChange(toggled(checked, id, on))}
        />
      )}
    </div>
  );
}

export interface Reach {
  readonly brandIds: ReadonlySet<string>;
  readonly accountIds: ReadonlySet<string>;
}

interface ReachPickersProps {
  readonly workspaceId: string;
  readonly reach: Reach;
  readonly error?: string | undefined;
  onChange(reach: Reach): void;
}

function ReachPickers({ workspaceId, reach, error, onChange }: ReachPickersProps) {
  const client = useApiClient();
  const brands = activeBrands(useQuery(brandsQuery(client, workspaceId)).data ?? []);
  const channels = useQuery(channelsQuery(client, workspaceId)).data ?? [];
  const nothing = reach.brandIds.size === 0 && reach.accountIds.size === 0;
  return (
    <div className="flex flex-col gap-4 ps-7">
      <Picker
        label={settingsText.settings_api_keys_access_brands()}
        empty={settingsText.settings_api_keys_access_no_brands()}
        items={brands.map((brand) => ({ id: brand.id, name: brand.name }))}
        checked={reach.brandIds}
        onChange={(brandIds) => onChange({ ...reach, brandIds })}
      />
      <Picker
        label={settingsText.settings_api_keys_access_channels()}
        empty={settingsText.settings_api_keys_access_no_channels()}
        items={channels.map((channel) => ({
          id: channel.id,
          name: channel.displayName,
          hint: providerUi(channel.provider).name(),
        }))}
        checked={reach.accountIds}
        onChange={(accountIds) => onChange({ ...reach, accountIds })}
      />
      {nothing ? (
        <p role="status" className="text-muted-foreground text-sm">
          {settingsText.settings_api_keys_access_empty()}
        </p>
      ) : null}
      {error === undefined ? null : <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

interface AccessFieldsProps extends ReachPickersProps {
  readonly access: Access;
  onAccess(access: Access): void;
}

export function AccessFields({ access, onAccess, ...pickers }: AccessFieldsProps) {
  const name = useId();
  const options = [
    { value: 'workspace', label: settingsText.settings_api_keys_access_workspace() },
    { value: 'restricted', label: settingsText.settings_api_keys_access_restricted() },
  ] as const;
  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 font-medium">{settingsText.settings_api_keys_access()}</legend>
      {options.map(({ value, label }) => (
        <label key={value} className="flex items-center gap-3">
          <input
            type="radio"
            name={name}
            value={value}
            className="size-4"
            checked={access === value}
            onChange={() => onAccess(value)}
          />
          {label}
        </label>
      ))}
      {access === 'restricted' ? <ReachPickers {...pickers} /> : null}
    </fieldset>
  );
}
