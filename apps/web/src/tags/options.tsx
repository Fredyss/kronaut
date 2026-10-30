import { cn } from '@kronaut/ui';
import { useEffect } from 'react';
import { m } from '../i18n.ts';
import { TagDot } from './dots.tsx';
import type { TagOption } from './tags.ts';

function optionKey(option: TagOption): string {
  return option.kind === 'tag' ? option.tag.id : `create:${option.name}`;
}

interface OptionsProps {
  readonly id: string;
  readonly options: readonly TagOption[];
  readonly active: number;
  onPick(option: TagOption): void;
}

export function Options({ id, options, active, onPick }: OptionsProps) {
  useEffect(() => {
    document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, active]);
  return (
    <div
      id={id}
      role="listbox"
      tabIndex={-1}
      aria-label={m.tags_label()}
      className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground text-sm shadow-md"
    >
      {options.length === 0 ? (
        <p className="px-2 py-1 text-muted-foreground">{m.tags_no_match()}</p>
      ) : null}
      {options.map((option, index) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: the input owns the keyboard (aria-activedescendant).
        <div
          key={optionKey(option)}
          id={`${id}-${index}`}
          role="option"
          tabIndex={-1}
          aria-selected={index === active}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(option)}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1',
            index === active && 'bg-accent text-accent-foreground',
          )}
        >
          {option.kind === 'tag' ? <TagDot color={option.tag.color} /> : null}
          <span className="truncate">
            {option.kind === 'tag' ? option.tag.name : m.tags_create({ name: option.name })}
          </span>
        </div>
      ))}
    </div>
  );
}
