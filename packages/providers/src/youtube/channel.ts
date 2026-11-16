import type { AccountProfile, BaseContext } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { isSuccess, youtubeFailure } from './errors.ts';

const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const CHANNEL_URL = 'https://www.youtube.com/channel/';

type ChannelPart = 'snippet' | 'snippet,statistics';

const channels = z.looseObject({
  items: z
    .array(
      z.looseObject({
        id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
        snippet: z.looseObject({
          title: z.string().optional(),
          customUrl: z.string().optional(),
        }),
        statistics: z
          .looseObject({
            subscriberCount: z.unknown().optional(),
            hiddenSubscriberCount: z.unknown().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});
type Channel = NonNullable<z.infer<typeof channels>['items']>[number];

export async function listChannels(
  ctx: BaseContext,
  accessToken: string,
  part: ChannelPart,
): Promise<readonly Channel[]> {
  const response = await send(ctx, 'none', `${CHANNELS_URL}?part=${part}&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!isSuccess(response.status)) throw await youtubeFailure(response, 'none', ctx.now());
  const { items } = await readJson(response, channels, 'none');
  return items ?? [];
}

export function channelProfile({ id, snippet }: Channel): AccountProfile {
  const title = snippet.title?.trim() ?? '';
  const handle = snippet.customUrl?.trim() ?? '';
  return {
    displayName: title === '' ? id : title,
    ...(handle === '' ? {} : { handle }),
    profileUrl: `${CHANNEL_URL}${id}`,
  };
}
