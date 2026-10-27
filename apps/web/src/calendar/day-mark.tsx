import { cn } from '@kronaut/ui';

export function DayMark({ label, today }: { readonly label: string; readonly today: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'tabular-nums',
          today ? 'font-semibold text-primary' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      {today ? <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" /> : null}
    </span>
  );
}
