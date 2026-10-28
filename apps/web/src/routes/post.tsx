import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  type Channel,
  channelsQuery,
  type Destination,
  meQuery,
  type Post,
  postQuery,
} from '../api.ts';
import { ApprovalSection } from '../approvals/panel.tsx';
import { docParagraphs } from '../compose/doc.ts';
import { issueMessage } from '../compose/issues.ts';
import { useApiClient } from '../context.ts';
import { httpsUrl, pollDelay, stateLabel } from '../destinations.ts';
import { useFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { summaryLabel } from '../post-summary.ts';
import { providerUi } from '../providers.ts';

const route = getRouteApi('/app/posts/$postId');

function scheduleLine(post: Post, format: (iso: string) => string): string {
  const at = post.destinations.find((d) => d.scheduledAt !== null)?.scheduledAt ?? null;
  if (post.scheduleMode === 'asap') return m.post_schedule_asap();
  if (at === null) return m.post_schedule_none();
  return post.scheduleTz === null
    ? m.post_schedule_at({ when: format(at) })
    : m.post_schedule_at_tz({ when: format(at), tz: post.scheduleTz });
}

type Item = Post['items'][number];

function Content({ item }: { readonly item: Item | undefined }) {
  const media = item?.media.length ?? 0;
  return (
    <>
      <div className="flex flex-col gap-2 whitespace-pre-wrap break-words text-sm">
        {docParagraphs(item?.doc).map((paragraph) => (
          <p key={paragraph.key} className="min-h-[1lh]">
            {paragraph.text}
          </p>
        ))}
      </div>
      {media === 0 ? null : (
        <p className="text-muted-foreground text-sm">{m.post_images({ count: media })}</p>
      )}
    </>
  );
}

function DestinationRow({
  destination,
  channel,
  custom,
  format,
}: {
  readonly destination: Destination;
  readonly channel: Channel | undefined;
  readonly custom: Item | undefined;
  readonly format: (iso: string) => string;
}) {
  const link = httpsUrl(destination.remoteUrl);
  const error = destination.lastErrorCode;
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-xl border p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {providerUi(destination.provider).name()}
        </span>
        <span className="truncate font-medium">
          {channel?.displayName ?? providerUi(destination.provider).name()}
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-sm">
          {destination.publishedAt === null ? null : (
            <span>{m.post_published_at({ when: format(destination.publishedAt) })}</span>
          )}
          {destination.publishedAt !== null || destination.scheduledAt === null ? null : (
            <span>{m.post_scheduled_at({ when: format(destination.scheduledAt) })}</span>
          )}
          {link === null ? null : (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              {m.post_view()}
            </a>
          )}
        </div>
        {error === null ? null : (
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-destructive">{issueMessage(error)}</p>
            <details className="text-muted-foreground">
              <summary className="cursor-pointer">{m.technical_details()}</summary>
              <p className="mt-1 font-mono text-xs">{error}</p>
            </details>
          </div>
        )}
        {custom === undefined ? null : (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              {m.post_customized()}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <Content item={custom} />
            </div>
          </details>
        )}
      </div>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
        {stateLabel(destination.state)}
      </span>
    </li>
  );
}

function PostStatus({
  workspaceId,
  postId,
}: {
  readonly workspaceId: string;
  readonly postId: string;
}) {
  const client = useApiClient();
  const post = useQuery({
    ...postQuery(client, workspaceId, postId),
    refetchInterval: (query) => pollDelay(query.state.data, Date.now()),
  });
  const channels = useQuery(channelsQuery(client, workspaceId));
  const format = useFormat(post.data?.scheduleTz ?? null);
  if (post.isError && post.data === undefined) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {m.post_not_found()}
      </p>
    );
  }
  if (post.data === undefined)
    return <p className="text-muted-foreground text-sm">{m.loading()}</p>;
  const data = post.data;
  const byId = new Map((channels.data ?? []).map((channel) => [channel.id, channel]));
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-sm">
          {summaryLabel(data.publishSummary)}
        </span>
        <span className="text-muted-foreground text-sm">{scheduleLine(data, format)}</span>
      </div>
      <ApprovalSection workspaceId={workspaceId} post={data} />
      <article className="flex flex-col gap-3 rounded-xl border p-4">
        <Content item={data.items[0]} />
      </article>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-lg">{m.post_destinations_title()}</h2>
        <ul className="flex flex-col gap-3">
          {data.destinations.map((destination) => (
            <DestinationRow
              key={destination.id}
              destination={destination}
              channel={byId.get(destination.accountId)}
              custom={
                destination.variant === null
                  ? undefined
                  : data.variants[destination.variant]?.items[0]
              }
              format={format}
            />
          ))}
        </ul>
      </section>
    </>
  );
}

export function PostPage() {
  const client = useApiClient();
  const { postId } = route.useParams();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="font-semibold text-2xl tracking-tight">{m.post_title()}</h1>
      {workspace === undefined ? null : <PostStatus workspaceId={workspace.id} postId={postId} />}
    </section>
  );
}
