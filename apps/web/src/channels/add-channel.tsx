import { Button, cn } from '@kronaut/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { trapTab } from '../approvals/password-dialog.tsx';
import { m } from '../i18n.ts';
import { Icon } from '../icon.tsx';
import { knownProviders, providerUi } from '../providers.ts';
import { ConnectForm, type ConnectRequest } from './connect-option.tsx';

export interface AddChannelProps {
  readonly available: readonly string[];
  readonly initial: string | null;
  readonly pending: boolean;
  readonly connect: (request: ConnectRequest) => void;
  readonly errorFor: (provider: string) => string | null;
  readonly fieldPrefix: string;
  onClose(): void;
}

function needsForm(provider: string): boolean {
  const ui = providerUi(provider);
  return ui.instance || ui.loginHint;
}

interface TileProps {
  readonly provider: string;
  readonly available: boolean;
  readonly pending: boolean;
  onPick(provider: string): void;
}

function Tile({ provider, available, pending, onPick }: TileProps) {
  const ui = providerUi(provider);
  const noteId = useId();
  const name = ui.name();
  return (
    <li>
      <button
        type="button"
        disabled={!available || pending}
        aria-label={m.channels_connect_button({ name })}
        aria-describedby={available ? undefined : noteId}
        onClick={() => onPick(provider)}
        className="flex h-full w-full flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-10 place-items-center rounded-full font-semibold',
            ui.badge,
            ui.badge === 'bg-foreground' ? 'text-background' : 'text-white',
          )}
        >
          {name.slice(0, 1)}
        </span>
        <span className="font-medium">{name}</span>
        {available ? null : (
          <span id={noteId} className="text-muted-foreground text-xs">
            {m.channels_not_set_up()}
          </span>
        )}
      </button>
    </li>
  );
}

function CloseIcon() {
  return (
    <Icon>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

function BackIcon() {
  return (
    <Icon>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

export function AddChannelDialog(props: AddChannelProps) {
  const { available, pending, connect, onClose } = props;
  const [picked, setPicked] = useState<string | null>(props.initial);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => opener?.focus();
  }, []);
  useEffect(() => {
    const target = picked === null ? 'li button:not([disabled])' : 'input';
    panel.current?.querySelector<HTMLElement>(target)?.focus();
  }, [picked]);
  const providers = [...new Set([...knownProviders(), ...available])];
  const pick = (provider: string) => {
    if (needsForm(provider)) setPicked(provider);
    else connect({ provider });
  };
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4 sm:pt-[12vh]">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
          trapTab(event);
        }}
        className="flex max-h-full w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-2xl border bg-background p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="font-semibold text-xl tracking-tight">
              {m.channels_connect_title()}
            </h2>
            <p id={bodyId} className="text-muted-foreground text-sm">
              {available.length === 0 ? m.channels_connect_none() : m.channels_connect_body()}
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label={m.dialog_close()} onClick={onClose}>
            <CloseIcon />
          </Button>
        </div>
        {picked === null ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {providers.map((provider) => (
              <Tile
                key={provider}
                provider={provider}
                available={available.includes(provider)}
                pending={pending}
                onPick={pick}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setPicked(null)}
            >
              <BackIcon />
              {m.channels_all_networks()}
            </Button>
            <ConnectForm
              provider={picked}
              pending={pending}
              connect={connect}
              error={props.errorFor(picked)}
              fieldPrefix={props.fieldPrefix}
            />
          </div>
        )}
      </div>
    </div>
  );
}
