import { buttonVariants } from '@kronaut/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { meQuery, type Post } from '../api.ts';
import { ChannelsFieldset } from '../compose/channel-picker.tsx';
import { ComposeBar } from '../compose/compose-bar.tsx';
import { ContentSection } from '../compose/content-section.tsx';
import { Discard, useLeaveGuard } from '../compose/leave-guard.tsx';
import { type OpenedPostData, openedPostQuery } from '../compose/opened-post.ts';
import { PreviewPane } from '../compose/preview-pane.tsx';
import { type ComposeStart, useComposeForm } from '../compose/use-compose-form.ts';
import { useApiClient } from '../context.ts';
import { m as composeText } from '../i18n/compose.ts';
import { m } from '../i18n.ts';
import { DRAFT_ROLES } from '../post-actions/permissions.ts';
import { editableBy } from '../post-actions/post-editable.ts';

export { PostEdit } from '../compose/post-edit.tsx';

const TagPicker = lazy(() =>
  import('../tags/picker.tsx').then((module) => ({ default: module.TagPicker })),
);

const route = getRouteApi('/app/compose');
const NOT_STORED: ReadonlySet<string> = new Set();

export interface ComposeFormProps extends ComposeStart {
  readonly workspaceId: string;
  readonly role: string;
  readonly onDirtyChange?: ((dirty: boolean) => void) | undefined;
  readonly onPendingChange?: ((pending: boolean) => void) | undefined;
  readonly onReload?: (() => void) | undefined;
}

export function ComposeForm(props: ComposeFormProps) {
  const { workspaceId, role, onDirtyChange, onPendingChange, onReload, ...start } = props;
  const form = useComposeForm(workspaceId, start);
  const { channels, content, selected, setSelected, flagged, setLimitFlags, pending } = form;
  const { dirty } = form;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);
  const limitsId = useId();

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.onSubmit} noValidate>
      <div className="relative min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-8">
            <ChannelsFieldset
              channels={channels.data}
              failed={channels.isError}
              mediaFor={content.mediaFor}
              customized={(id) => content.contents.customized.has(id)}
              stored={start.opened?.form.stored ?? NOT_STORED}
              selected={selected}
              setSelected={setSelected}
              pending={pending}
            />
            <ContentSection
              state={content}
              flagged={flagged}
              pending={pending}
              limitsId={limitsId}
              onIssuesChange={setLimitFlags}
            />
            <Suspense fallback={null}>
              <TagPicker
                workspaceId={workspaceId}
                value={form.tags.value}
                onChange={form.tags.set}
                onCreating={form.tags.setCreating}
                editable={DRAFT_ROLES.has(role)}
                disabled={pending}
              />
            </Suspense>
          </div>
          <PreviewPane state={content} />
        </div>
      </div>
      <ComposeBar
        form={form}
        role={role}
        opened={start.opened}
        limitsId={limitsId}
        onReload={onReload}
      />
    </form>
  );
}

export interface EditFormProps {
  readonly workspaceId: string;
  readonly role: string;
  readonly postId: string;
  readonly onDone?: ComposeStart['onDone'];
  readonly onDirtyChange?: ComposeFormProps['onDirtyChange'];
  readonly onPendingChange?: ComposeFormProps['onPendingChange'];
}

function usableOpened(role: string, data: OpenedPostData | undefined) {
  if (data === undefined || !editableBy(role, data.post)) return null;
  return data.result.ok ? { ...data, form: data.result.form } : null;
}

export function EditForm({ postId, ...form }: EditFormProps) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loads, setLoads] = useState(0);
  const scope = { client, queryClient, workspaceId: form.workspaceId };
  const load = useQuery(openedPostQuery(scope, postId, loads));
  const opened = usableOpened(form.role, load.data);
  const refused = load.isError || (load.data !== undefined && opened === null);
  useEffect(() => {
    if (refused) void navigate({ to: '/posts/$postId', params: { postId }, replace: true });
  }, [refused, navigate, postId]);
  if (opened === null) return <p className="p-5 text-muted-foreground text-sm">{m.loading()}</p>;
  return (
    <ComposeForm
      key={`${postId}:${loads}`}
      {...form}
      opened={opened}
      onReload={() => setLoads((count) => count + 1)}
    />
  );
}

interface GuardedFormProps {
  readonly workspaceId: string;
  readonly role: string;
  readonly at: string | undefined;
  readonly tz: string | undefined;
  readonly post: string | undefined;
}

function GuardedForm({ workspaceId, role, at, tz, post }: GuardedFormProps) {
  const navigate = useNavigate();
  const saved = useRef<Post | null>(null);
  const guard = useLeaveGuard(() => {
    if (saved.current === null) return;
    void navigate({ to: '/posts/$postId', params: { postId: saved.current.id } });
  });
  const form = {
    workspaceId,
    role,
    onDirtyChange: guard.setDirty,
    onPendingChange: guard.setSaving,
    onDone: (done: Post) => {
      saved.current = done;
      guard.leave();
    },
  };
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div inert={guard.prompt} className="flex min-h-0 flex-1 flex-col">
        {post === undefined ? (
          <ComposeForm {...form} at={at} tz={tz} />
        ) : (
          <EditForm {...form} postId={post} />
        )}
      </div>
      {guard.prompt ? <Discard onKeep={guard.keep} onDiscard={guard.leave} /> : null}
    </div>
  );
}

function BackLink({ post }: { readonly post: string | undefined }) {
  const className = buttonVariants({ variant: 'ghost', size: 'sm', className: 'self-start' });
  return post === undefined ? (
    <Link to="/" className={className}>
      {composeText.compose_back()}
    </Link>
  ) : (
    <Link to="/posts/$postId" params={{ postId: post }} className={className}>
      {composeText.compose_back()}
    </Link>
  );
}

export function ComposePage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  const { at, tz, post } = route.useSearch();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col">
      <header className="flex flex-col gap-1 px-5 pt-6">
        <BackLink post={post} />
        <h1 className="font-semibold text-2xl tracking-tight">
          {post === undefined ? composeText.compose_title() : m.post_edit_title()}
        </h1>
        {post === undefined ? (
          <p className="text-muted-foreground text-sm">{composeText.compose_subtitle()}</p>
        ) : null}
      </header>
      {workspace === undefined ? null : (
        <GuardedForm workspaceId={workspace.id} role={workspace.role} at={at} tz={tz} post={post} />
      )}
    </section>
  );
}
