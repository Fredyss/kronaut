import { Button, Modal, toast } from '@kronaut/ui';
import { type ReactNode, useId } from 'react';

export interface SecretText {
  readonly title: string;
  readonly once: string;
  readonly copy: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly done: string;
}

async function copy(secret: string, text: SecretText): Promise<void> {
  try {
    await navigator.clipboard.writeText(secret);
    toast(text.copied);
  } catch {
    toast(text.copyFailed, 'destructive');
  }
}

interface SecretDialogProps {
  readonly secret: string;
  readonly text: SecretText;
  readonly children?: ReactNode;
  onClose(): void;
}

export function SecretDialog({ secret, text, children, onClose }: SecretDialogProps) {
  const titleId = useId();
  const noteId = useId();
  return (
    <Modal labelledBy={titleId} describedBy={noteId} onCancel={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {text.title}
        </h2>
        <p id={noteId} className="font-medium text-sm">
          {text.once}
        </p>
        <output
          aria-labelledby={titleId}
          className="block select-all break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm"
        >
          {secret}
        </output>
        <div className="flex flex-col gap-1 text-muted-foreground text-sm">{children}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void copy(secret, text)}>
            {text.copy}
          </Button>
          <Button type="button" onClick={onClose}>
            {text.done}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
