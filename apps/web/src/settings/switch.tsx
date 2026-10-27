import { cn } from '@kronaut/ui';
import type { ComponentProps } from 'react';

export type SwitchProps = Omit<ComponentProps<'button'>, 'type' | 'role' | 'onChange'> & {
  readonly checked: boolean;
  onCheckedChange(checked: boolean): void;
};

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  const state = checked ? 'checked' : 'unchecked';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={state}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent p-0.5 shadow-xs outline-none transition-colors',
        'bg-input data-[state=checked]:bg-primary dark:bg-input/80 dark:data-[state=checked]:bg-primary',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span
        data-state={state}
        className="pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4 dark:bg-foreground dark:data-[state=checked]:bg-primary-foreground"
      />
    </button>
  );
}
