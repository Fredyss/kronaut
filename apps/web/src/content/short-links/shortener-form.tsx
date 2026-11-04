import { Button, Label, Select, TextField } from '@kronaut/ui';
import { type FormEvent, useId, useState } from 'react';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { shortenerErrors } from './errors.ts';
import type { Shortener, ShortenerProvider } from './queries.ts';
import { type ShortenerDraft, useSaveShortener } from './writes.ts';

const BASE_URL_MAX = 2048;
const DOMAIN_MAX = 190;
const API_KEY_MAX = 1024;
const PROVIDERS: readonly ShortenerProvider[] = ['dub', 'kutt'];

function ProviderField({
  provider,
  fixed,
  onChange,
}: {
  readonly provider: ShortenerProvider;
  readonly fixed: boolean;
  onChange(provider: ShortenerProvider): void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{settingsText.settings_short_links_provider()}</Label>
      <Select
        id={id}
        value={provider}
        disabled={fixed}
        onChange={(event) => onChange(event.currentTarget.value as ShortenerProvider)}
        className="max-w-56"
      >
        {PROVIDERS.map((option) => (
          <option key={option} value={option}>
            {settingsText.settings_short_links_provider_name({ provider: option })}
          </option>
        ))}
      </Select>
    </div>
  );
}

function initialDraft(shortener: Shortener | null): ShortenerDraft {
  return {
    provider: shortener?.provider ?? 'dub',
    baseUrl: shortener?.provider === 'kutt' ? shortener.baseUrl : '',
    domain: shortener?.domain ?? '',
    apiKey: '',
  };
}

export interface ShortenerFormProps {
  readonly workspaceId: string;
  readonly shortener: Shortener | null;
  onDone(): void;
}

export function ShortenerForm({ workspaceId, shortener, onDone }: ShortenerFormProps) {
  const connected = shortener !== null;
  const [draft, setDraft] = useState(() => initialDraft(shortener));
  const save = useSaveShortener(workspaceId, connected, onDone);
  const errors = save.error === null ? {} : shortenerErrors(save.error);
  const kutt = draft.provider === 'kutt';
  const formError = errors.form ?? (kutt ? undefined : errors.baseUrl);
  const set = (change: Partial<ShortenerDraft>) =>
    setDraft((current) => ({ ...current, ...change }));
  const ready = (!kutt || draft.baseUrl.trim() !== '') && (connected || draft.apiKey.trim() !== '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready && !save.isPending) save.mutate(draft);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-4">
      <fieldset disabled={save.isPending} className="contents">
        <ProviderField
          provider={draft.provider}
          fixed={connected}
          onChange={(provider) => set({ provider })}
        />
        {kutt ? (
          <TextField
            label={settingsText.settings_short_links_base_url()}
            hint={settingsText.settings_short_links_base_url_hint()}
            value={draft.baseUrl}
            maxLength={BASE_URL_MAX}
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.baseUrl}
            onValueChange={(baseUrl) => set({ baseUrl })}
          />
        ) : null}
        <TextField
          label={settingsText.settings_short_links_domain()}
          value={draft.domain}
          maxLength={DOMAIN_MAX}
          autoCapitalize="none"
          spellCheck={false}
          error={errors.domain}
          onValueChange={(domain) => set({ domain })}
        />
        <TextField
          label={settingsText.settings_short_links_api_key()}
          hint={connected ? settingsText.settings_short_links_api_key_keep() : undefined}
          type="password"
          autoComplete="off"
          value={draft.apiKey}
          maxLength={API_KEY_MAX}
          error={errors.apiKey}
          onValueChange={(apiKey) => set({ apiKey })}
        />
      </fieldset>
      {formError === undefined ? null : (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {connected ? (
          <Button type="button" variant="ghost" disabled={save.isPending} onClick={onDone}>
            {settingsText.settings_short_links_cancel()}
          </Button>
        ) : null}
        <Button type="submit" disabled={!ready || save.isPending}>
          {save.isPending
            ? settingsText.settings_short_links_checking()
            : connected
              ? m.settings_save()
              : settingsText.settings_short_links_connect()}
        </Button>
      </div>
    </form>
  );
}
