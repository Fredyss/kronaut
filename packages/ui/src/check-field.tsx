import { type CheckItem, CheckList } from './check-list.tsx';

interface CheckFieldProps<T extends string> {
  readonly label: string;
  readonly items: readonly CheckItem<T>[];
  readonly checked: ReadonlySet<T>;
  readonly hint?: string;
  readonly empty?: string;
  readonly error?: string | undefined;
  onChange(checked: ReadonlySet<T>): void;
}

function toggled<T>(current: ReadonlySet<T>, id: T, on: boolean): ReadonlySet<T> {
  const next = new Set(current);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function CheckField<T extends string>({
  label,
  items,
  checked,
  hint,
  empty,
  error,
  onChange,
}: CheckFieldProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-sm">{label}</span>
      {hint === undefined ? null : <p className="text-muted-foreground text-sm">{hint}</p>}
      {empty !== undefined && items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <CheckList
          label={label}
          items={items}
          checked={checked}
          onToggle={(id, on) => onChange(toggled(checked, id, on))}
        />
      )}
      {error === undefined ? null : <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
