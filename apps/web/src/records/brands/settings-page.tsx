import { Button, Input, SettingsCard, SettingsPage } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { errorStatus } from '../../base/api/errors.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { NameField } from '../../base/ui/name-field.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { BRAND_NAME_MAX, type Brand, brandsQuery } from './queries.ts';
import { brandError, useCreateBrand, useUpdateBrand } from './writes.ts';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

function CreateBrand({ workspaceId }: { readonly workspaceId: string }) {
  const create = useCreateBrand(workspaceId);
  const [name, setName] = useState('');
  const errorId = useId();
  const failed = create.error !== null && errorStatus(create.error) !== 401;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = name.normalize('NFC').trim();
    if (next === '' || create.isPending) return;
    create.mutate(next, { onSuccess: () => setName('') });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={settingsText.settings_brand_new()}
          placeholder={settingsText.settings_brand_new()}
          value={name}
          maxLength={BRAND_NAME_MAX}
          aria-invalid={failed}
          aria-describedby={failed ? errorId : undefined}
          onChange={(event) => {
            setName(event.currentTarget.value);
            if (create.error !== null) create.reset();
          }}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={create.isPending}>
          {settingsText.settings_brand_add()}
        </Button>
      </div>
      {failed ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {brandError(create.error)}
        </p>
      ) : null}
    </form>
  );
}

function BrandFacts({ brand }: { readonly brand: Brand }) {
  return (
    <>
      {brand.archivedAt === null ? null : (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
          {settingsText.settings_brand_archived()}
        </span>
      )}
      <span className="text-muted-foreground text-sm tabular-nums">
        {settingsText.settings_brand_channels({ count: brand.channelCount })}
      </span>
    </>
  );
}

function EditableRow({
  workspaceId,
  brand,
}: {
  readonly workspaceId: string;
  readonly brand: Brand;
}) {
  const update = useUpdateBrand(workspaceId, brand.id);
  const archived = brand.archivedAt !== null;
  return (
    <li className="flex flex-wrap items-center gap-3 px-6 py-3">
      <NameField
        name={brand.name}
        label={settingsText.settings_brand_name({ name: brand.name })}
        maxLength={BRAND_NAME_MAX}
        onRename={(name, onRefused) => update.mutate({ name }, { onError: onRefused })}
      />
      <BrandFacts brand={brand} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={update.isPending}
        aria-label={
          archived
            ? settingsText.settings_brand_unarchive_of({ name: brand.name })
            : settingsText.settings_brand_archive_of({ name: brand.name })
        }
        onClick={() => update.mutate({ archived: !archived })}
      >
        {archived ? settingsText.settings_brand_unarchive() : settingsText.settings_brand_archive()}
      </Button>
    </li>
  );
}

function ReadOnlyRow({ brand }: { readonly brand: Brand }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-6 py-3 text-sm">
      <span className="min-w-0 flex-1 truncate">{brand.name}</span>
      <BrandFacts brand={brand} />
    </li>
  );
}

function BrandList({
  workspaceId,
  editable,
}: {
  readonly workspaceId: string;
  readonly editable: boolean;
}) {
  const client = useApiClient();
  const brands = useQuery(brandsQuery(client, workspaceId));
  if (brands.data === undefined) {
    return brands.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  if (brands.data.length === 0) {
    return <p className="text-muted-foreground text-sm">{settingsText.settings_brands_empty()}</p>;
  }
  return (
    <SettingsCard title={settingsText.settings_brand_list_title()}>
      <ul className="flex flex-col divide-y">
        {brands.data.map((brand) =>
          editable ? (
            <EditableRow key={brand.id} workspaceId={workspaceId} brand={brand} />
          ) : (
            <ReadOnlyRow key={brand.id} brand={brand} />
          ),
        )}
      </ul>
    </SettingsCard>
  );
}

export function BrandSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  const editable = workspace !== undefined && EDITORS.has(workspace.role);
  return (
    <SettingsPage
      title={settingsText.settings_brand_list_title()}
      intro={settingsText.settings_brand_list_intro()}
    >
      {workspace === undefined ? null : (
        <div className="flex flex-col gap-6">
          {editable ? (
            <CreateBrand workspaceId={workspace.id} />
          ) : (
            <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>
          )}
          <BrandList workspaceId={workspace.id} editable={editable} />
        </div>
      )}
    </SettingsPage>
  );
}
