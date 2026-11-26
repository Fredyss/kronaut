import { useId } from 'react';

export interface CheckItem<T extends string = string> {
  readonly id: T;
  readonly name: string;
  readonly hint?: string;
}

interface CheckListProps<T extends string> {
  readonly label: string;
  readonly items: readonly CheckItem<T>[];
  readonly checked: ReadonlySet<T>;
  onToggle(id: T, on: boolean): void;
}

export function CheckList<T extends string>({
  label,
  items,
  checked,
  onToggle,
}: CheckListProps<T>) {
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
