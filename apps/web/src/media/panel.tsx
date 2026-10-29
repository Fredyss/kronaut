import { Button } from '@kronaut/ui';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { trapTab } from '../approvals/password-dialog.tsx';
import { m as mediaText } from '../i18n/media.ts';
import { m } from '../i18n.ts';
import { Icon } from '../icon.tsx';
import { kindLabel } from './format.ts';
import { AiLabel, AltTextForm, Details, Usage } from './panel-sections.tsx';
import type { LibraryAsset } from './queries.ts';
import { Preview } from './tile.tsx';
import { type AssetActions, useAssetActions } from './use-asset-actions.ts';

interface PanelProps {
  readonly workspaceId: string;
  readonly asset: LibraryAsset;
  onClose(): void;
}

function DeleteSection({ asset, actions }: { asset: LibraryAsset; actions: AssetActions }) {
  const [confirming, setConfirming] = useState(false);
  if (asset.usageCount > 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" disabled>
          {mediaText.media_delete()}
        </Button>
        <span className="text-muted-foreground text-sm">
          {mediaText.media_in_use({ count: asset.usageCount })}
        </span>
      </div>
    );
  }
  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        onClick={() => setConfirming(true)}
      >
        {mediaText.media_delete()}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3 text-sm">
      <p>{mediaText.media_delete_body()}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={actions.remove.isPending}
          onClick={() => actions.remove.mutate()}
        >
          {mediaText.media_delete_confirm()}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          {m.inbox_cancel()}
        </Button>
      </div>
    </div>
  );
}

function useDialogFocus(panel: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    return () => opener?.focus();
  }, [panel]);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function AssetPanel({ workspaceId, asset, onClose }: PanelProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const actions = useAssetActions(workspaceId, asset.id, onClose);
  useDialogFocus(panel, onClose);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l bg-background p-6 shadow-lg outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-semibold text-xl tracking-tight">
            {kindLabel(asset)}
          </h2>
          <Button variant="ghost" size="icon" aria-label={m.dialog_close()} onClick={onClose}>
            <Icon>
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </Button>
        </div>
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
          <Preview asset={asset} iconClassName="size-12" alt={asset.altText ?? ''} />
        </div>
        <Details asset={asset} />
        <AltTextForm key={asset.altText ?? ''} asset={asset} actions={actions} />
        <AiLabel asset={asset} actions={actions} />
        <Usage workspaceId={workspaceId} mediaId={asset.id} />
        <DeleteSection asset={asset} actions={actions} />
      </div>
    </div>
  );
}
