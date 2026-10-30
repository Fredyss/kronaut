import { Button, Input, Label } from '@kronaut/ui';
import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { m as settingsText } from '../i18n/settings.ts';
import { m } from '../i18n.ts';
import { SAVED_TEXT_MAX, SAVED_TEXT_NAME_MAX } from './saved-texts.ts';

const TEXT_AREA =
  'min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring';

export interface Draft {
  readonly name: string;
  readonly text: string;
}

function useFocusWhileOpen(target: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    target.current?.focus();
    return () => {
      if (opener?.isConnected === true) opener.focus();
    };
  }, [target]);
}

export function SavedTextForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  readonly initial: Draft;
  readonly pending: boolean;
  onSave(draft: Draft): void;
  onCancel(): void;
}) {
  const nameId = useId();
  const textId = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [text, setText] = useState(initial.text);
  useFocusWhileOpen(nameInput);
  const blank = name.trim() === '' || text.trim() === '';
  const unchanged = name === initial.name && text === initial.text;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!blank && !pending) onSave({ name, text });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && unchanged) onCancel();
  };
  return (
    <form onSubmit={submit} onKeyDown={onKeyDown} className="flex basis-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>{settingsText.settings_saved_text_name()}</Label>
        <Input
          ref={nameInput}
          id={nameId}
          value={name}
          maxLength={SAVED_TEXT_NAME_MAX}
          onChange={(event) => setName(event.currentTarget.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={textId}>{settingsText.settings_saved_text_text()}</Label>
        <textarea
          id={textId}
          value={text}
          maxLength={SAVED_TEXT_MAX}
          onChange={(event) => setText(event.currentTarget.value)}
          className={TEXT_AREA}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {settingsText.settings_saved_text_cancel()}
        </Button>
        <Button type="submit" disabled={blank || pending}>
          {m.settings_save()}
        </Button>
      </div>
    </form>
  );
}

export function DeleteSavedText({
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  readonly name: string;
  readonly pending: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const keep = useRef<HTMLButtonElement>(null);
  useFocusWhileOpen(keep);
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
      className="flex basis-full flex-col gap-3 rounded-md border p-4"
    >
      <h3 id={titleId} className="font-medium text-sm">
        {settingsText.settings_saved_text_delete_title({ name })}
      </h3>
      <p id={bodyId} className="text-muted-foreground text-sm">
        {settingsText.settings_saved_text_delete_body()}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button ref={keep} type="button" variant="ghost" onClick={onCancel}>
          {settingsText.settings_saved_text_keep()}
        </Button>
        <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
          {settingsText.settings_saved_text_delete_confirm()}
        </Button>
      </div>
    </div>
  );
}
