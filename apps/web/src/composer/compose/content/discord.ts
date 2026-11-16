import type { Destination } from '../../../records/posts/queries.ts';

type Settings = Destination['settings'];

export const DISCORD_DEFAULT: Settings = { silent: false, pingEveryone: false };

export interface DiscordFields {
  readonly silent: boolean;
  readonly pingEveryone: boolean;
}

export function discordFields({ silent, pingEveryone }: Settings): DiscordFields {
  return { silent: silent === true, pingEveryone: pingEveryone === true };
}
