import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
  const [selected, setSelected] = useState('');
  if (texts.length === 0) return null;
  const label = composeText.compose_insert_saved_text();
  const picked = texts.find((text) => text.id === selected);
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={label}
        value={selected}
        disabled={disabled}
        onChange={(event) => setSelected(event.currentTarget.value)}
        className={`${SELECT} max-w-56`}
      >
        <option value="">{label}</option>
        {texts.map((text) => (
          <option key={text.id} value={text.id}>
            {text.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || picked === undefined}
        onClick={() => {
          if (picked === undefined) return;
          onPick(docText(picked.doc));
          setSelected('');
        }}
      >
        {composeText.compose_insert()}
      </Button>
    </div>
  );
}
