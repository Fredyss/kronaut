import { Button } from '@kronaut/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useId, useState } from 'react';
import { meQuery } from '../api.ts';
import { ChannelsFieldset } from '../compose/channel-picker.tsx';
import { ContentSection } from '../compose/content-section.tsx';
import { EditNotes } from '../compose/edit-notes.tsx';
import { Failure } from '../compose/failure.tsx';
import { Discard, useLeaveGuard } from '../compose/leave-guard.tsx';
import { type OpenedPostData, openedPostQuery } from '../compose/opened-post.ts';
import { REPEAT_ROLES } from '../compose/repeat.ts';
import {
  type ComposeStart,
  type OpenedCompose,
  useComposeForm,
} from '../compose/use-compose-form.ts';
import { submitLabel } from '../compose/when.ts';
import { ModeOption, WhenFieldset } from '../compose/when-fieldset.tsx';
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

function SubmitRow({
  label,
  disabled,
  describedBy,
  onRequest,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly describedBy: string | undefined;
  readonly onRequest: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={disabled} aria-describedby={describedBy}>
        {label}
      </Button>
      {onRequest === undefined ? null : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby={describedBy}
          onClick={onRequest}
        >
          {m.compose_request_approval()}
        </Button>
      )}
    </div>
  );
}

export interface ComposeFormProps extends ComposeStart {
  readonly workspaceId: string;
  readonly role: string;
  readonly onDirtyChange?: ((dirty: boolean) => void) | undefined;
  readonly onReload?: (() => void) | undefined;
}

type FormState = ReturnType<typeof useComposeForm>;

function WhenSection({
  form,
  role,
  opened,
}: {
  readonly form: FormState;
  readonly role: string;
  readonly opened: OpenedCompose | undefined;
}) {
  const { when, pending, approval, queue, repeat } = form;
  const dateId = useId();
  const timeId = useId();
  return (
    <>
      <WhenFieldset
        when={when}
        dateId={dateId}
        timeId={timeId}
        pending={pending}
        note={approval.requesting ? approval.note : undefined}
        queue={approval.request ? undefined : queue}
        repeat={REPEAT_ROLES.has(role) && opened === undefined ? repeat : undefined}
        extraMode={
          <ModeOption
            value="draft"
            label={composeText.compose_keep_draft()}
            when={when}
            disabled={pending}
          />
        }
      />
      {opened === undefined ? null : (
        <EditNotes form={opened} mode={when.mode} selected={form.selected} />
      )}
    </>
  );
}

export function ComposeForm(props: ComposeFormProps) {
  const { workspaceId, role, onDirtyChange, onReload, ...start } = props;
  const form = useComposeForm(workspaceId, start);
  const { channels, list, content, selected, setSelected, when, formError, blocked } = form;
  const { flagged, setLimitFlags, failure, pending, onSubmit, approval, requestInstead } = form;
  const { dirty } = form;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  const limitsId = useId();

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit} noValidate>
      <ContentSection
        state={content}
        flagged={flagged}
        pending={pending}
        limitsId={limitsId}
        onIssuesChange={setLimitFlags}
      />

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

      <WhenSection form={form} role={role} opened={start.opened} />

      {formError === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      )}
      {failure === null ? null : <Failure error={failure} channels={list} onReload={onReload} />}

      <SubmitRow
        label={submitLabel(when.mode, pending, approval.requesting)}
        disabled={pending || blocked || form.tags.creating}
        describedBy={blocked ? limitsId : undefined}
        onRequest={approval.offer ? requestInstead : undefined}
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
  if (opened === null) return <p className="text-muted-foreground text-sm">{m.loading()}</p>;
  return (
    <ComposeForm
      key={`${postId}:${loads}`}
      {...form}
      opened={opened}
      onReload={() => setLoads((count) => count + 1)}
    />
  );
}

function GuardedEdit({ workspaceId, role, postId }: Omit<EditFormProps, 'onDone'>) {
  const navigate = useNavigate();
  const guard = useLeaveGuard(() => {
    void navigate({ to: '/posts/$postId', params: { postId } });
  });
  return (
    <div className="relative">
      <div inert={guard.prompt}>
        <EditForm
          workspaceId={workspaceId}
          role={role}
          postId={postId}
          onDone={guard.leave}
          onDirtyChange={guard.setDirty}
        />
      </div>
      {guard.prompt ? <Discard onKeep={guard.keep} onDiscard={guard.leave} /> : null}
    </div>
  );
}

export function ComposePage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  const { at, tz, post } = route.useSearch();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          {post === undefined ? composeText.compose_title() : m.post_edit_title()}
        </h1>
        {post === undefined ? (
          <p className="text-muted-foreground text-sm">{composeText.compose_subtitle()}</p>
        ) : null}
      </header>
      {workspace === undefined ? null : post === undefined ? (
        <ComposeForm workspaceId={workspace.id} at={at} tz={tz} role={workspace.role} />
      ) : (
        <GuardedEdit workspaceId={workspace.id} role={workspace.role} postId={post} />
      )}
    </section>
  );
}
