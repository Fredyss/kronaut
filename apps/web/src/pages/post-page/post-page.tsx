import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { lazy, type ReactNode, Suspense } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { useFormat } from '../../base/locale/format.ts';
import { m } from '../../base/locale/i18n.ts';
import { providerUi } from '../../base/providers/ui.ts';
import { issueMessage } from '../../composer/compose/issues.ts';
import { SeriesSection } from '../../content/series/section.tsx';
import { ShortLinks } from '../../content/short-links/post-links.tsx';
import { ANALYTICS_ROLES } from '../../records/analytics/roles.ts';
import { AnalyticsSection } from '../../records/analytics/section.tsx';
import { type Channel, channelsQuery } from '../../records/channels/queries.ts';
import { httpsUrl, pollDelay, stateLabel } from '../../records/posts/destinations.ts';
import { docParagraphs, docText, isBlank, toDoc } from '../../records/posts/doc.ts';
import { DRAFT_ROLES } from '../../records/posts/permissions.ts';
import { canceledLive, editableBy } from '../../records/posts/post-editable.ts';
import { shownSignature } from '../../records/posts/post-signature.ts';
import { type Destination, type Post, postQuery } from '../../records/posts/queries.ts';
import { summaryLabel } from '../../records/posts/summary.ts';
import { ApprovalSection } from '../../views/approvals/panel.tsx';
import { EVERGREEN_ROLES, EvergreenSection } from '../../views/evergreen/section.tsx';
import { PostCompose } from './post-compose.tsx';
import { isSettled, PublishedView } from './published.tsx';

const route = getRouteApi('/app/posts/$postId');

const PostEdit = lazy(() =>
  import('../../composer/compose/compose-page.tsx').then((module) => ({
    default: module.PostEdit,
  })),
);

const PostTags = lazy(() =>
  import('../../content/tags/picker.tsx').then((module) => ({ default: module.PostTags })),
);

function scheduleLine(post: Post, format: (iso: string) => string): string {
  const at = post.destinations.flatMap((d) => d.scheduledAt ?? []).sort()[0] ?? null;
  if (post.scheduleMode === 'asap') return m.post_schedule_asap();
  if (at === null) return m.post_schedule_none();
  return post.scheduleTz === null
    ? m.post_schedule_at({ when: format(at) })
    : m.post_schedule_at_tz({ when: format(at), tz: post.scheduleTz });
}

function publishedLine(post: Post, format: (iso: string) => string): string {
  const at = post.destinations.flatMap((d) => d.publishedAt ?? []).sort()[0];
  return at === undefined ? scheduleLine(post, format) : m.post_published_at({ when: format(at) });
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

function signatureText(
  destination: Destination,
  channel: Channel | undefined,
  main: Item | undefined,
) {
  const signature = shownSignature(destination, channel);
  return signature === null || isBlank(toDoc(main?.doc)) ? null : docText(signature);
}

function DestinationRow({
  destination,
  channel,
  main,
  custom,
  format,
  shortLinks,
}: {
  readonly destination: Destination;
  readonly channel: Channel | undefined;
  readonly main: Item | undefined;
  readonly custom: Item | undefined;
  readonly format: (iso: string) => string;
  readonly shortLinks: ReactNode;
}) {
  const link = httpsUrl(destination.remoteUrl);
  const signature = signatureText(destination, channel, custom ?? main);
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
        {signature === null ? null : (
          <p className="whitespace-pre-wrap break-words text-muted-foreground text-sm">
            {m.post_signature({ text: signature })}
          </p>
        )}
        {shortLinks}
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

interface DestinationsProps {
  readonly workspaceId: string;
  readonly post: Post;
  readonly channels: ReadonlyMap<string, Channel>;
  readonly format: (iso: string) => string;
}

function Destinations({ workspaceId, post, channels, format }: DestinationsProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-lg">{m.post_destinations_title()}</h2>
      <ul className="flex flex-col gap-3">
        {post.destinations.map((destination) => (
          <DestinationRow
            key={destination.id}
            destination={destination}
            channel={channels.get(destination.accountId)}
            main={post.items[0]}
            custom={
              destination.variant === null
                ? undefined
                : post.variants[destination.variant]?.items[0]
            }
            format={format}
            shortLinks={
              <ShortLinks
                workspaceId={workspaceId}
                postId={post.id}
                destinationId={destination.id}
              />
            }
          />
        ))}
      </ul>
    </section>
  );
}

function PostStatus({
  workspaceId,
  postId,
  role,
}: {
  readonly workspaceId: string;
  readonly postId: string;
  readonly role: string;
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
  const settled = isSettled(data);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-sm">
          {summaryLabel(data.publishSummary)}
        </span>
        {settled ? null : (
          <span className="text-muted-foreground text-sm">{scheduleLine(data, format)}</span>
        )}
      </div>
      {editableBy(role, data) || canceledLive(data) ? (
        <Suspense fallback={null}>
          <PostEdit workspaceId={workspaceId} post={data} />
        </Suspense>
      ) : null}
      {settled ? (
        <PublishedView
          workspaceId={workspaceId}
          post={data}
          role={role}
          time={publishedLine(data, format)}
          content={<Content item={data.items[0]} />}
        />
      ) : null}
      <Suspense fallback={null}>
        <PostTags workspaceId={workspaceId} post={data} editable={DRAFT_ROLES.has(role)} />
      </Suspense>
      <ApprovalSection workspaceId={workspaceId} post={data} />
      {data.seriesId === null ? null : (
        <SeriesSection workspaceId={workspaceId} seriesId={data.seriesId} />
      )}
      <EvergreenSection
        workspaceId={workspaceId}
        post={data}
        channels={byId}
        format={format}
        editable={EVERGREEN_ROLES.has(role)}
      />
      {settled ? null : (
        <article className="flex flex-col gap-3 rounded-xl border p-4">
          <Content item={data.items[0]} />
        </article>
      )}
      <AnalyticsSection
        workspaceId={workspaceId}
        post={data}
        channels={byId}
        format={format}
        readable={ANALYTICS_ROLES.has(role)}
      />
      <Destinations workspaceId={workspaceId} post={data} channels={byId} format={format} />
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
      {workspace === undefined ? null : (
        <>
          <PostStatus workspaceId={workspace.id} postId={postId} role={workspace.role} />
          <PostCompose workspaceId={workspace.id} postId={postId} role={workspace.role} />
        </>
      )}
    </section>
  );
}
