import { m } from '../../base/locale/i18n.ts';

export function LoadState({ failed }: { readonly failed: boolean }) {
  return failed ? (
    <p role="alert" className="text-destructive text-sm">
      {m.error_generic()}
    </p>
  ) : (
    <p className="text-muted-foreground text-sm">{m.loading()}</p>
  );
}
