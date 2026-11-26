import { ConfirmDialog, type ConfirmProps } from './confirm-dialog.tsx';

export function ConfirmDelete(props: Omit<ConfirmProps, 'tone'>) {
  return <ConfirmDialog {...props} tone="destructive" />;
}
