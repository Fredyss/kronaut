import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../context.ts';
import { m as composeText } from '../i18n/compose.ts';
import { SELECT } from '../locale-select.tsx';
import { savedTextsQuery } from '../saved-texts/saved-texts.ts';
import { docText } from './doc.ts';

interface SavedTextMenuProps {
  readonly workspaceId: string;
  readonly disabled: boolean;
  readonly onPick: (text: string) => void;
}

export function SavedTextMenu({ workspaceId, disabled, onPick }: SavedTextMenuProps) {
  const client = useApiClient();
  const texts = useQuery(savedTextsQuery(client, workspaceId)).data ?? [];
  if (texts.length === 0) return null;
  const label = composeText.compose_insert_saved_text();
  return (
    <select
      aria-label={label}
      value=""
      disabled={disabled}
      onChange={(event) => {
        const picked = texts.find((text) => text.id === event.currentTarget.value);
        if (picked !== undefined) onPick(docText(picked.doc));
      }}
      className={`${SELECT} max-w-56`}
    >
      <option value="">{label}</option>
      {texts.map((text) => (
        <option key={text.id} value={text.id}>
          {text.name}
        </option>
      ))}
    </select>
  );
}
