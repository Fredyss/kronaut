import type { ComponentProps } from 'react';
import { cn } from './cn.ts';

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className={cn(
        'h-8 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
    />
  );
}
