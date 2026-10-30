import { buttonVariants } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { channelsQuery, type Post } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m as composeText } from '../i18n/compose.ts';
import { m } from '../i18n.ts';
import { canceledLive } from '../post-actions/post-editable.ts';
import { postMediaQuery } from '../post-actions/post-media.ts';
import { fromPost, type Refusal } from './from-post.ts';

function refusalText(reason: Refusal): string {
  switch (reason) {
    case 'channel_unavailable':
      return composeText.compose_refused_channel_unavailable();
    case 'channel_twice':
      return composeText.compose_refused_channel_twice();
    case 'reply_media':
      return composeText.compose_refused_reply_media();
    case 'mixed_media':
      return composeText.compose_refused_mixed_media();
    case 'many_videos':
      return composeText.compose_refused_many_videos();
    case 'repeated_media':
      return composeText.compose_refused_repeated_media();
    case 'media_unavailable':
      return composeText.compose_refused_media_unavailable();
    case 'item_order':
      return composeText.compose_refused_item_order();
    case 'publish_type':
      return composeText.compose_refused_publish_type();
    case 'rich_content':
      return composeText.compose_refused_rich_content();
  }
}

export function PostEdit({
  workspaceId,
  post,
}: {
  readonly workspaceId: string;
  readonly post: Post;
}) {
  const client = useApiClient();
  const channels = useQuery(channelsQuery(client, workspaceId)).data;
  const assets = useQuery(postMediaQuery(client, workspaceId, post)).data;
  if (canceledLive(post)) {
    return (
      <p className="text-muted-foreground text-sm">{composeText.compose_refused_part_live()}</p>
    );
  }
  if (channels === undefined || assets === undefined) return null;
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const result = fromPost(post, byId, channels);
  if (!result.ok) {
    return <p className="text-muted-foreground text-sm">{refusalText(result.reason)}</p>;
  }
  return (
    <div>
      <Link
        to="/compose"
        search={{ post: post.id }}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        {m.post_action_edit()}
      </Link>
    </div>
  );
}
