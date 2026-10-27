import { Button, Input, Label } from '@kronaut/ui';
import { type FormEvent, useId } from 'react';
import { detailCodes, errorDetails, errorStatus } from '../api.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';

export interface ConnectRequest {
  readonly provider: string;
  readonly loginHint?: string;
  readonly instance?: string;
}

export interface ConnectError {
  readonly text: string;
  readonly field: boolean;
}

function instanceError(error: unknown): string | null {
  const status = errorStatus(error);
  if (status === 429) return m.channels_server_rate_limited();
  if (status === 503) return m.channels_server_unreachable();
  const codes = errorDetails(error)
    .filter((detail) => detail.path === 'body.instance')
    .map((detail) => detail.code);
  if (codes.includes('provider_rejected')) return m.channels_server_rejected();
  if (codes.includes('required') || codes.includes('invalid')) return m.channels_server_invalid();
  return null;
}

function startError(error: unknown): string {
  const status = errorStatus(error);
  const codes = detailCodes(error);
  if (status === 503) return m.channels_connect_unavailable();
  if (codes.includes('app_config')) return m.channels_connect_not_set_up();
  if (codes.includes('provider_rejected') || status === 400) {
    return m.channels_connect_check_handle();
  }
  return m.channels_error_generic();
}

export function connectError(error: unknown, request: ConnectRequest): ConnectError {
  const field = request.instance === undefined ? null : instanceError(error);
  return field === null ? { text: startError(error), field: false } : { text: field, field: true };
}

export function serverFieldId(prefix: string, provider: string): string {
  return `${prefix}-${provider}-server`;
}

export interface OptionProps {
  readonly provider: string;
  readonly pending: boolean;
  readonly connect: (request: ConnectRequest) => void;
  readonly error: string | null;
  readonly fieldPrefix: string;
}

function ServerForm({ provider, pending, connect, error, fieldPrefix }: OptionProps) {
  const ui = providerUi(provider);
  const id = serverFieldId(fieldPrefix, provider);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const instance = String(new FormData(event.currentTarget).get('instance') ?? '').trim();
    connect({ provider, instance });
  };
  return (
    <form className="flex flex-wrap items-start gap-2" onSubmit={submit}>
      <div className="flex min-w-56 flex-1 flex-col gap-2">
        <Label htmlFor={id}>{m.channels_server_label({ name: ui.name() })}</Label>
        <Input
          id={id}
          name="instance"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          placeholder={m.channels_server_placeholder()}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : `${id}-error`}
        />
        {error === null ? null : (
          <p id={`${id}-error`} className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" variant="outline" className="mt-7" disabled={pending}>
        {m.channels_connect_button({ name: ui.name() })}
      </Button>
    </form>
  );
}

function HandleForm({ provider, pending, connect }: OptionProps) {
  const handleId = useId();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hint = String(new FormData(event.currentTarget).get('loginHint') ?? '').trim();
    connect(hint === '' ? { provider } : { provider, loginHint: hint });
  };
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
      <div className="flex min-w-56 flex-1 flex-col gap-2">
        <Label htmlFor={handleId}>{m.channels_handle_label()}</Label>
        <Input
          id={handleId}
          name="loginHint"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={m.channels_handle_placeholder()}
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {m.channels_connect_button({ name: providerUi(provider).name() })}
      </Button>
    </form>
  );
}

export function ConnectForm(props: OptionProps) {
  return providerUi(props.provider).instance ? (
    <ServerForm {...props} />
  ) : (
    <HandleForm {...props} />
  );
}
