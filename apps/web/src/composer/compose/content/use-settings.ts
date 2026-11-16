import { useState } from 'react';
import type { Channel } from '../../../records/channels/queries.ts';
import type { Destination } from '../../../records/posts/queries.ts';
import type { OpenedForm } from '../from-post.ts';
import { DISCORD_DEFAULT } from './discord.ts';
import { YOUTUBE_DEFAULT } from './youtube.ts';

export type Settings = Destination['settings'];

const DEFAULTS: Readonly<Record<string, Settings>> = {
  discord: DISCORD_DEFAULT,
  youtube: YOUTUBE_DEFAULT,
};
const NONE: ReadonlyMap<string, Settings> = new Map();

export function useSettings(seed?: OpenedForm) {
  const [own, setOwn] = useState(seed?.settings ?? NONE);
  return {
    settingsOf(channel: Channel): Settings | undefined {
      if (!Object.hasOwn(DEFAULTS, channel.provider)) return undefined;
      return own.get(channel.id) ?? DEFAULTS[channel.provider];
    },
    setSettings(channelId: string, settings: Settings) {
      setOwn((current) => new Map(current).set(channelId, settings));
    },
  };
}
