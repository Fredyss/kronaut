import { cn } from '@kronaut/ui';
import type { ReactNode } from 'react';

export type Tone = 'ok' | 'neutral' | 'warn' | 'bad';

const TONES: Readonly<Record<Tone, string>> = {
  ok: 'bg-secondary text-secondary-foreground',
  neutral: 'bg-muted text-muted-foreground',
  warn: 'border border-destructive/50 text-destructive',
  bad: 'bg-destructive text-white',
};

export function StatusBadge({
  tone,
  children,
}: {
  readonly tone: Tone;
  readonly children: string;
}) {
  return (
    <span
      className={cn('whitespace-nowrap rounded-full px-2 py-0.5 font-medium text-xs', TONES[tone])}
    >
      {children}
    </span>
  );
}

interface StatusRowProps {
  readonly title: ReactNode;
  readonly children?: ReactNode;
  readonly badges: readonly { readonly tone: Tone; readonly text: string }[];
}

export function StatusRow({ title, children, badges }: StatusRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        <div className="font-medium">{title}</div>
        {children}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">
        {badges.map((badge) => (
          <StatusBadge key={badge.text} tone={badge.tone}>
            {badge.text}
          </StatusBadge>
        ))}
      </div>
    </div>
  );
}

export function Muted({ children }: { readonly children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}
