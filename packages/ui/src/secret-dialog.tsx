import { type ReactNode, useId } from 'react';
import { Button } from './button.tsx';
import { Modal } from './modal.tsx';
import { toast } from './toast.tsx';

export interface SecretLabels {
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly done: string;
}

async function copy(secret: string, labels: SecretLabels): Promise<void> {
  try {
    await navigator.clipboard.writeText(secret);
    toast(labels.copied);
  } catch {
    toast(labels.copyFailed, 'destructive');
  }
}

interface SecretDialogProps {
  readonly secret: string;
  readonly title: string;
  readonly once: string;
  readonly labels: SecretLabels;
  readonly children?: ReactNode;
  onClose(): void;
}

export function SecretDialog({
  secret,
  title,
  once,
  labels,
  children,
  onClose,
}: SecretDialogProps) {
  const titleId = useId();
  const noteId = useId();
  return (
    <Modal labelledBy={titleId} describedBy={noteId} onCancel={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {title}
        </h2>
        <p id={noteId} className="font-medium text-sm">
          {once}
        </p>
        <output
          aria-labelledby={titleId}
          className="block select-all break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm"
        >
          {secret}
        </output>
        <div className="flex flex-col gap-1 text-muted-foreground text-sm">{children}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void copy(secret, labels)}>
            {labels.copy}
          </Button>
          <Button type="button" onClick={onClose}>
            {labels.done}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
