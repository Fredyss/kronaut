import { type Client, type MediaGetResponse, mediaGet } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { errorStatus, type Post } from '../api.ts';

export type MediaAsset = MediaGetResponse;

function mediaIds(post: Post): string[] {
  const items = [...post.items, ...post.variants.flatMap((variant) => variant.items)];
  return [...new Set(items.flatMap((item) => item.media.map((media) => media.mediaId)))].sort();
}

async function assetOf(client: Client, workspaceId: string, mediaId: string) {
  try {
    return (await mediaGet({ client, path: { workspaceId, mediaId } })).data;
  } catch (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
}

export function postMediaQuery(client: Client, workspaceId: string, post: Post) {
  const ids = mediaIds(post);
  return queryOptions({
    queryKey: ['media', workspaceId, 'previews', ...ids],
    queryFn: async () => {
      const assets = await Promise.all(ids.map((id) => assetOf(client, workspaceId, id)));
      return assets.filter((asset) => asset !== null);
    },
    staleTime: 30 * 60_000,
  });
}
