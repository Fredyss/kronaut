import { type KeyboardEvent, useRef, useState } from 'react';

interface NameFieldProps {
  readonly name: string;
  readonly label: string;
  readonly maxLength: number;
  onRename(name: string, onRefused: () => void): void;
}

export function NameField({ name: current, label, maxLength, onRename }: NameFieldProps) {
  const [name, setName] = useState(current);
  const [stored, setStored] = useState(current);
  const sent = useRef<string | null>(null);
  if (stored !== current) {
    setStored(current);
    setName(current);
  }
  const commit = () => {
    const next = name.normalize('NFC').trim();
    if (next === '' || next === current) return setName(current);
    if (next === sent.current) return;
    sent.current = next;
    setName(next);
    onRename(next, () => {
      sent.current = null;
      setName(current);
    });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit();
  };
  return (
    <input
      aria-label={label}
      value={name}
      maxLength={maxLength}
      onChange={(event) => setName(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
    />
  );
}
