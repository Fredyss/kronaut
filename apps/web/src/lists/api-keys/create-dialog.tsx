import { Button, Modal, TextField } from '@kronaut/ui';
import { type FormEvent, useId, useState } from 'react';
import { m as settingsText } from '../../i18n/settings.ts';
import { AccessFields } from './access-fields.tsx';
import { bodyOf, draftReady, EMPTY_DRAFT, type KeyDraft, rateLimitOf, today } from './draft.ts';
import { type KeyErrors, keyErrors } from './errors.ts';
import { API_KEY_NAME_MAX, DEFAULT_RATE_LIMIT, RATE_LIMIT_MAX } from './queries.ts';
import { ScopeField } from './scope-field.tsx';
import { useCreateApiKey } from './writes.ts';

interface FieldsProps {
  readonly workspaceId: string;
  readonly draft: KeyDraft;
  readonly errors: KeyErrors;
  onChange(change: Partial<KeyDraft>): void;
}

function LimitFields({ draft, errors, onChange }: Omit<FieldsProps, 'workspaceId'>) {
  const rateInvalid = rateLimitOf(draft.rateLimit) === undefined;
  return (
    <>
      <TextField
        label={settingsText.settings_api_keys_expiry()}
        hint={settingsText.settings_api_keys_expiry_hint()}
        type="date"
        min={today()}
        value={draft.expiresOn}
        error={errors.expiry}
        onValueChange={(expiresOn) => onChange({ expiresOn })}
      />
      <TextField
        label={settingsText.settings_api_keys_rate_limit()}
        hint={settingsText.settings_api_keys_rate_limit_hint({
          max: RATE_LIMIT_MAX,
          count: DEFAULT_RATE_LIMIT,
        })}
        inputMode="numeric"
        autoComplete="off"
        value={draft.rateLimit}
        error={
          errors.rateLimit ??
          (rateInvalid
            ? settingsText.settings_api_keys_rate_limit_invalid({ max: RATE_LIMIT_MAX })
            : undefined)
        }
        onValueChange={(rateLimit) => onChange({ rateLimit })}
      />
    </>
  );
}

function KeyFields({ workspaceId, draft, errors, onChange }: FieldsProps) {
  return (
    <>
      <TextField
        label={settingsText.settings_api_keys_name()}
        hint={settingsText.settings_api_keys_name_hint()}
        autoComplete="off"
        value={draft.name}
        maxLength={API_KEY_NAME_MAX}
        error={errors.name}
        onValueChange={(name) => onChange({ name })}
      />
      <ScopeField
        scopes={draft.scopes}
        error={errors.scopes}
        onChange={(scopes) => onChange({ scopes })}
      />
      <AccessFields
        workspaceId={workspaceId}
        access={draft.access}
        reach={draft}
        error={errors.access}
        onAccess={(access) => onChange({ access })}
        onChange={onChange}
      />
      <LimitFields draft={draft} errors={errors} onChange={onChange} />
    </>
  );
}

interface CreateDialogProps {
  readonly workspaceId: string;
  onClose(token: string | null): void;
}

export function CreateDialog({ workspaceId, onClose }: CreateDialogProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<KeyDraft>(EMPTY_DRAFT);
  const create = useCreateApiKey(workspaceId, onClose);
  const errors = create.error === null ? {} : keyErrors(create.error);
  const blocked = create.isPending || !draftReady(draft);
  const close = () => {
    if (!create.isPending) onClose(null);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!blocked) create.mutate(bodyOf(draft));
  };
  return (
    <Modal labelledBy={titleId} wide onCancel={close}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {settingsText.settings_api_keys_add()}
        </h2>
        <fieldset disabled={create.isPending} className="contents">
          <KeyFields
            workspaceId={workspaceId}
            draft={draft}
            errors={errors}
            onChange={(change) => setDraft((current) => ({ ...current, ...change }))}
          />
        </fieldset>
        <p role="alert" className="text-destructive text-sm empty:hidden">
          {errors.form}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {settingsText.settings_api_keys_cancel()}
          </Button>
          <Button type="submit" disabled={blocked}>
            {settingsText.settings_api_keys_create()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
