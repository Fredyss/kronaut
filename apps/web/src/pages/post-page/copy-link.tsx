import { toast } from '@kronaut/ui';
import type { ReactNode } from 'react';
import { m } from '../../base/locale/i18n.ts';

async function copy(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast(m.post_link_copied());
  } catch {
    toast(m.post_link_copy_failed(), 'destructive');
  }
}

export function CopyLink({ url }: { readonly url: string }): ReactNode {
  return (
    <button
      type="button"
      className="text-foreground underline underline-offset-4"
      onClick={() => void copy(url)}
    >
      {m.post_copy_link()}
    </button>
  );
}
