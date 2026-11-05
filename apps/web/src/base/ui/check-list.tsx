import { useId } from 'react';

interface CheckItem {
  readonly id: string;
  readonly name: string;
  readonly hint?: string;
}

interface CheckListProps {
  readonly label: string;
  readonly items: readonly CheckItem[];
  readonly checked: ReadonlySet<string>;
  onToggle(id: string, on: boolean): void;
}

export function CheckList({ label, items, checked, onToggle }: CheckListProps) {
  const prefix = useId();
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {items.map((item) => {
        const id = `${prefix}-${item.id}`;
        return (
          <li key={item.id} className="flex items-center gap-3">
            <input
              id={id}
              type="checkbox"
              className="size-4"
              checked={checked.has(item.id)}
              onChange={(event) => onToggle(item.id, event.currentTarget.checked)}
            />
            <label htmlFor={id} className="text-sm">
              {item.name}
              {item.hint === undefined ? null : (
                <span className="text-muted-foreground"> {item.hint}</span>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
