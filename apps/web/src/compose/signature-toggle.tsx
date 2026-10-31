import { useId } from 'react';
import type { Channel } from '../api.ts';
import { m as composeText } from '../i18n/compose.ts';
import type { ContentsState } from './use-contents.ts';

interface SignatureToggleProps {
  readonly state: ContentsState;
  readonly channel: Channel | undefined;
  readonly pending: boolean;
}

export function SignatureToggle({ state, channel, pending }: SignatureToggleProps) {
  const id = useId();
  const signature = channel?.signature ?? null;
  if (channel === undefined || signature === null) return null;
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        className="size-4"
        checked={!state.skipped.has(channel.id)}
        disabled={pending}
        onChange={(event) => state.setSkipped(channel.id, !event.currentTarget.checked)}
      />
      <label htmlFor={id} className="text-sm">
        {composeText.compose_add_signature({ name: signature.name })}
      </label>
    </div>
  );
}
