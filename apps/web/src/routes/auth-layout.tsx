import type { ReactNode } from 'react';
import { m } from '../i18n.ts';

export function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
      <p className="font-semibold text-lg tracking-tight">{m.app_name()}</p>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
