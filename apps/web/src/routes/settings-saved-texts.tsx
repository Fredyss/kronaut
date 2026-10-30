import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { meQuery } from '../api.ts';
import { docText, textToParagraphs } from '../compose/doc.ts';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { m } from '../i18n.ts';
import { DeleteSavedText, type Draft, SavedTextForm } from '../saved-texts/form.tsx';
import { type SavedText, savedTextsQuery } from '../saved-texts/saved-texts.ts';
import { useCreateSavedText, useSavedTextWrites } from '../saved-texts/writes.ts';
import { SettingsCard, SettingsPage } from '../settings/card.tsx';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

function toBody({ name, text }: Draft) {
  return {
    name: name.normalize('NFC').trim(),
    doc: { type: 'doc', content: textToParagraphs(text) },
  };
}

function focusNeighbour(row: HTMLElement | null): void {
  const sibling = row?.nextElementSibling ?? row?.previousElementSibling;
  const target = sibling?.querySelector('button') ?? row?.closest<HTMLElement>('[tabindex="-1"]');
  target?.focus();
}

function Summary({ savedText }: { readonly savedText: SavedText }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
      <span className="truncate font-medium">{savedText.name}</span>
      <span className="line-clamp-2 whitespace-pre-line text-muted-foreground">
        {docText(savedText.doc).trim()}
      </span>
    </div>
  );
}

function EditableRow({
  workspaceId,
  savedText,
}: {
  readonly workspaceId: string;
  readonly savedText: SavedText;
}) {
  const row = useRef<HTMLLIElement>(null);
  const { id, name } = savedText;
  const { update, remove } = useSavedTextWrites(workspaceId, id, () => focusNeighbour(row.current));
  const [open, setOpen] = useState<'edit' | 'delete' | null>(null);
  const close = () => setOpen(null);
  return (
    <li ref={row} className="flex flex-wrap items-center gap-3 px-6 py-3">
      <Summary savedText={savedText} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={settingsText.settings_saved_text_edit_named({ name })}
        onClick={() => setOpen('edit')}
      >
        {settingsText.settings_saved_text_edit()}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={settingsText.settings_saved_text_delete({ name })}
        disabled={open === 'edit'}
        onClick={() => setOpen('delete')}
      >
        {settingsText.settings_saved_text_delete_confirm()}
      </Button>
      {open === 'edit' ? (
        <SavedTextForm
          initial={{ name, text: docText(savedText.doc) }}
          pending={update.isPending}
          onSave={(draft) => update.mutate(toBody(draft), { onSuccess: close })}
          onCancel={close}
        />
      ) : null}
      {open === 'delete' ? (
        <DeleteSavedText
          name={name}
          pending={remove.isPending}
          onCancel={close}
          onConfirm={() => remove.mutate(undefined, { onSettled: close })}
        />
      ) : null}
    </li>
  );
}

function ReadOnlyRow({ savedText }: { readonly savedText: SavedText }) {
  return (
    <li className="flex items-center gap-3 px-6 py-3">
      <Summary savedText={savedText} />
    </li>
  );
}

function AddSavedText({ workspaceId }: { readonly workspaceId: string }) {
  const [adding, setAdding] = useState(false);
  const create = useCreateSavedText(workspaceId, () => setAdding(false));
  const addButton = useRef<HTMLButtonElement>(null);
  const wasAdding = useRef(false);
  useEffect(() => {
    if (wasAdding.current && !adding) addButton.current?.focus();
    wasAdding.current = adding;
  }, [adding]);
  if (!adding) {
    return (
      <Button
        ref={addButton}
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setAdding(true)}
      >
        {settingsText.settings_saved_text_add()}
      </Button>
    );
  }
  return (
    <SettingsCard title={settingsText.settings_saved_text_add()}>
      <div className="px-6 py-4">
        <SavedTextForm
          initial={{ name: '', text: '' }}
          pending={create.isPending}
          onSave={(draft) => create.mutate(toBody(draft))}
          onCancel={() => setAdding(false)}
        />
      </div>
    </SettingsCard>
  );
}

function SavedTextList({
  workspaceId,
  role,
}: {
  readonly workspaceId: string;
  readonly role: string;
}) {
  const client = useApiClient();
  const texts = useQuery(savedTextsQuery(client, workspaceId));
  if (texts.data === undefined) {
    return texts.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  const editable = EDITORS.has(role);
  return (
    <>
      {editable ? (
        <AddSavedText workspaceId={workspaceId} />
      ) : (
        <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>
      )}
      {texts.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{settingsText.settings_saved_texts_empty()}</p>
      ) : (
        <SettingsCard title={settingsText.settings_saved_texts_title()}>
          <ul className="flex flex-col divide-y">
            {texts.data.map((savedText) =>
              editable ? (
                <EditableRow key={savedText.id} workspaceId={workspaceId} savedText={savedText} />
              ) : (
                <ReadOnlyRow key={savedText.id} savedText={savedText} />
              ),
            )}
          </ul>
        </SettingsCard>
      )}
    </>
  );
}

export function SavedTextSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={settingsText.settings_saved_texts_title()}
      intro={settingsText.settings_saved_texts_intro()}
    >
      <div tabIndex={-1} className="flex flex-col gap-6 outline-none">
        {workspace === undefined ? null : (
          <SavedTextList workspaceId={workspace.id} role={workspace.role} />
        )}
      </div>
    </SettingsPage>
  );
}
