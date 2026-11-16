import { Switch } from '@kronaut/ui';
import { useId } from 'react';
import { providerUi } from '../../../base/providers/ui.ts';
import { m as composeText } from '../../../i18n/compose.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import { discordFields } from './discord.ts';
import type { ContentsState } from './use-contents.ts';

interface ToggleProps {
  readonly label: string;
  readonly checked: boolean;
  readonly pending: boolean;
  onChange(checked: boolean): void;
}

function Toggle({ label, checked, pending, onChange }: ToggleProps) {
  const labelId = useId();
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span id={labelId}>{label}</span>
      <Switch
        aria-labelledby={labelId}
        checked={checked}
        disabled={pending}
        onCheckedChange={onChange}
      />
    </div>
  );
}

interface DiscordSettingsProps {
  readonly state: ContentsState;
  readonly channel: Channel | undefined;
  readonly pending: boolean;
}

export function DiscordSettings({ state, channel, pending }: DiscordSettingsProps) {
  if (channel === undefined || channel.provider !== 'discord') return null;
  const settings = state.settingsOf(channel);
  if (settings === undefined) return null;
  const fields = discordFields(settings);
  const set = (field: 'silent' | 'pingEveryone', value: boolean) =>
    state.setSettings(channel.id, { ...settings, [field]: value });
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border p-4">
      <legend className="px-1 font-medium text-sm">{providerUi(channel.provider).name()}</legend>
      <Toggle
        label={composeText.compose_discord_silent()}
        checked={fields.silent}
        pending={pending}
        onChange={(silent) => set('silent', silent)}
      />
      <Toggle
        label={composeText.compose_discord_ping_everyone()}
        checked={fields.pingEveryone}
        pending={pending}
        onChange={(pingEveryone) => set('pingEveryone', pingEveryone)}
      />
    </fieldset>
  );
}
