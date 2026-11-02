import type { ReactNode } from 'react';

export function SettingsPage({
  title,
  intro,
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold text-xl tracking-tight">{title}</h2>
        {intro === undefined ? null : <p className="text-muted-foreground text-sm">{intro}</p>}
      </header>
      {children}
    </section>
  );
}
