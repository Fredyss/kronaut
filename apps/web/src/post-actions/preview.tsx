import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { type Channel, channelsQuery, type Post, postQuery } from '../api.ts';
import type { Doc } from '../compose/doc.ts';
import type { PreviewTarget } from '../compose/preview/preview.tsx';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { Modal } from './modal.tsx';
import { postMediaQuery } from './post-media.ts';

const Previews = lazy(() => import('../compose/preview/preview.tsx'));

type Item = Post['items'][number];

function mainItem(post: Post, variant: number | null): Item | undefined {
  const items = variant === null ? post.items : (post.variants[variant]?.items ?? post.items);
  return items.find((item) => item.role === 'main') ?? items[0];
}

interface Thumb {
  readonly url: string | null;
  readonly video: boolean;
}

function useThumbs(workspaceId: string, post: Post): ReadonlyMap<string, Thumb> {
  const client = useApiClient();
  const assets = useQuery(postMediaQuery(client, workspaceId, post)).data ?? [];
  return new Map(
    assets.map((asset) => [asset.id, { url: asset.previewUrl, video: asset.kind === 'video' }]),
  );
}

function targetsOf(
  post: Post,
  channels: readonly Channel[],
  thumbs: ReadonlyMap<string, Thumb>,
): PreviewTarget[] {
  const byId = new Map(channels.map((channel) => [channel.id, channel]));
  return post.destinations.flatMap((destination) => {
    const channel = byId.get(destination.accountId);
    const item = mainItem(post, destination.variant);
    if (channel === undefined || item === undefined) return [];
    const video = item.media.find((media) => thumbs.get(media.mediaId)?.video === true);
    const images = item.media
      .filter((media) => media !== video)
      .map((media) => ({
        id: media.mediaId,
        thumb: thumbs.get(media.mediaId)?.url ?? null,
        altText: media.altText ?? '',
      }));
    const poster = video === undefined ? null : (thumbs.get(video.mediaId)?.url ?? null);
    return [
      {
        channel,
        doc: item.doc as unknown as Doc,
        images,
        video: null,
        poster,
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
