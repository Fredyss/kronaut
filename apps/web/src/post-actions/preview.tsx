import { mediaGet } from '@kronaut/sdk';
import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { type Channel, channelsQuery, type Post, postQuery } from '../api.ts';
import type { Doc } from '../compose/doc.ts';
import type { PreviewTarget } from '../compose/preview/preview.tsx';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { Modal } from './modal.tsx';

const Previews = lazy(() => import('../compose/preview/preview.tsx'));

type Item = Post['items'][number];

function mainItem(post: Post, variant: number | null): Item | undefined {
  const items = variant === null ? post.items : (post.variants[variant]?.items ?? post.items);
  return items.find((item) => item.role === 'main') ?? items[0];
}

function useThumbs(workspaceId: string, post: Post): ReadonlyMap<string, string | null> {
  const client = useApiClient();
  const ids = [
    ...new Set(
      [...post.items, ...post.variants.flatMap((v) => v.items)].flatMap((item) =>
        item.media.map((media) => media.mediaId),
      ),
    ),
  ].sort();
  const thumbs = useQuery({
    queryKey: ['media', workspaceId, 'previews', ...ids],
    queryFn: async () =>
      await Promise.all(
        ids.map(async (mediaId) => {
          const { data } = await mediaGet({ client, path: { workspaceId, mediaId } });
          return [mediaId, data.previewUrl] as const;
        }),
      ),
    enabled: ids.length > 0,
    staleTime: 30 * 60_000,
  });
  return new Map(thumbs.data ?? []);
}

function targetsOf(
  post: Post,
  channels: readonly Channel[],
  thumbs: ReadonlyMap<string, string | null>,
): PreviewTarget[] {
  const byId = new Map(channels.map((channel) => [channel.id, channel]));
  return post.destinations.flatMap((destination) => {
    const channel = byId.get(destination.accountId);
    const item = mainItem(post, destination.variant);
    if (channel === undefined || item === undefined) return [];
    const images = item.media.map((media) => ({
      id: media.mediaId,
      thumb: thumbs.get(media.mediaId) ?? null,
      altText: media.altText ?? '',
    }));
    return [
      {
        channel,
        doc: item.doc as unknown as Doc,
        images,
        video: null,
        publishType: destination.publishType,
      },
    ];
  });
}

export interface PostPreviewProps {
  readonly workspaceId: string;
  readonly post: Post;
  readonly stacked?: boolean;
}

export function PostPreview({ workspaceId, post, stacked = false }: PostPreviewProps) {
  const client = useApiClient();
  const channels = useQuery(channelsQuery(client, workspaceId));
  const thumbs = useThumbs(workspaceId, post);
  if (channels.data === undefined) return null;
  const empty = <p className="text-muted-foreground text-sm">{m.post_preview_empty()}</p>;
  return (
    <Suspense fallback={null}>
      <Previews targets={targetsOf(post, channels.data, thumbs)} empty={empty} stacked={stacked} />
    </Suspense>
  );
}

export interface PreviewDialogProps {
  readonly workspaceId: string;
  readonly postId: string;
  onClose(): void;
}

export function PreviewDialog({ workspaceId, postId, onClose }: PreviewDialogProps) {
  const client = useApiClient();
  const post = useQuery(postQuery(client, workspaceId, postId));
  return (
    <Modal label={m.post_preview_title()} wide onCancel={onClose}>
      <div className="flex flex-col gap-4">
        {post.data === undefined ? (
          <p role={post.isError ? 'alert' : undefined} className="text-muted-foreground text-sm">
            {post.isError ? m.post_not_found() : m.loading()}
          </p>
        ) : (
          <PostPreview workspaceId={workspaceId} post={post.data} />
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {m.close()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
