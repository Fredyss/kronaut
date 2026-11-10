import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { useLocale } from '../../base/locale/context.ts';
import { m } from '../../base/locale/i18n.ts';
import type { PostTag } from '../../content/tags/tags.ts';
import { approvalPolicyQuery, approvalRequired } from '../../records/approval-policy/queries.ts';
import { type Channel, channelsQuery } from '../../records/channels/queries.ts';
import { groupsKey } from '../../records/groups/queries.ts';
import { type Post, postKey, postsKey } from '../../records/posts/queries.ts';
import { type Sources, storedSources, withoutPicks } from './content/group-picks.ts';
import { useContents } from './content/use-contents.ts';
import type { OpenedForm } from './from-post.ts';
import { formFingerprint } from './submit/draft-body.ts';
import {
  emptyProblem,
  goneProblem,
  isEmpty,
  type Plan,
  planInput,
  toPlan,
  videoProblem,
  withSources,
} from './submit/plan.ts';
import { type ComposeInput, createSubmitter, type OpenedPost } from './submit/submit.ts';
import { refusedForApproval, SubmitError, stalePickAccounts } from './submit/submit-error.ts';
import { useOpenedWhen } from './when/opened-when.ts';
import { useQueueChoice } from './when/queue-choice.ts';
import { type RepeatControl, useRepeatControl } from './when/repeat.ts';
import { resolveWhen, type WhenState } from './when/when.ts';

type When = ReturnType<typeof resolveWhen>;

function sameTags(a: readonly PostTag[], b: readonly PostTag[]): boolean {
  const ids = new Set(a.map((tag) => tag.id));
  return ids.size === b.length && b.every((tag) => ids.has(tag.id));
}

function withRepeat(resolved: When, { preview: result }: RepeatControl): When {
  if (!('when' in resolved) || resolved.when.mode !== 'instant') return resolved;
  if ('problem' in result) return result;
  return result.repeat === undefined
    ? resolved
    : { when: { ...resolved.when, repeat: result.repeat } };
}

function usePublish(
  workspaceId: string,
  onDone: ((post: Post) => void) | undefined,
  opened: OpenedPost | undefined,
  onRefused: (error: SubmitError) => void,
) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submit] = useState(() => createSubmitter(client, workspaceId, opened));
  const run = useMutation({
    mutationFn: (input: ComposeInput) => submit(input),
    onSuccess: async (post) => {
      await queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) });
      queryClient.setQueryData(postKey(workspaceId, post.id), post);
      if (onDone !== undefined) return onDone(post);
      await navigate({ to: '/posts/$postId', params: { postId: post.id } });
    },
    onError: (error) => {
      if (error instanceof SubmitError) onRefused(error);
      return queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) });
    },
  });
  const failure =
    run.error === null || run.error instanceof SubmitError
      ? run.error
      : new SubmitError('create', run.error, []);
  return { run, failure };
}

function useStalePickReset(workspaceId: string, setSources: Dispatch<SetStateAction<Sources>>) {
  const queryClient = useQueryClient();
  return (error: SubmitError) => {
    const stale = stalePickAccounts(error);
    if (stale.length === 0) return;
    setSources((current) => withoutPicks(current, stale));
    void queryClient.invalidateQueries({ queryKey: groupsKey(workspaceId) });
  };
}

function usePublishing(
  workspaceId: string,
  onDone: ((post: Post) => void) | undefined,
  form: {
    readonly start: OpenedPost | undefined;
    readonly picks: { readonly setSources: Dispatch<SetStateAction<Sources>> };
  },
) {
  const onRefused = useStalePickReset(workspaceId, form.picks.setSources);
  return usePublish(workspaceId, onDone, form.start, onRefused);
}

function planBrands(list: readonly Channel[], plan: Plan): (string | null)[] {
  return list
    .filter((channel) => plan.destinations.some((d) => d.accountId === channel.id))
    .map((channel) => channel.brandId);
}

function useApprovalMode(
  workspaceId: string,
  failure: SubmitError | null,
  brandIds: readonly (string | null)[],
) {
  const client = useApiClient();
  const policy = useQuery(approvalPolicyQuery(client, workspaceId));
  const [forced, setForced] = useState(false);
  const [note, setNote] = useState('');
  const request = forced || approvalRequired(policy.data, brandIds);
  const offer = !request && failure?.step === 'schedule' && refusedForApproval(failure.cause);
  return { request, offer, force: () => setForced(true), note: { value: note, set: setNote } };
}

function resolveFull(when: WhenState, repeat: RepeatControl): When {
  return withRepeat(resolveWhen(when.mode, when.date, when.time, when.tz), repeat);
}

function usePlanQueue(workspaceId: string, list: readonly Channel[], plan: Plan) {
  return useQueueChoice(
    workspaceId,
    list.filter((channel) => plan.destinations.some((d) => d.accountId === channel.id)),
  );
}

export interface OpenedCompose {
  readonly post: Post;
  readonly channels: readonly Channel[];
  readonly form: OpenedForm;
}

export interface ComposeStart {
  readonly at?: string | undefined;
  readonly tz?: string | undefined;
  readonly onDone?: ((post: Post) => void) | undefined;
  readonly opened?: OpenedCompose | undefined;
}

function useOpenedForm(workspaceId: string, opened: OpenedCompose | undefined) {
  const client = useApiClient();
  const channels = useQuery(channelsQuery(client, workspaceId));
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => opened?.form.selected ?? new Set(),
  );
  const [sources, setSources] = useState<Sources>(() =>
    storedSources(opened?.post.destinations ?? []),
  );
  const [tags, setTags] = useState<readonly PostTag[]>(() => opened?.post.tags ?? []);
  const [creating, setCreating] = useState(false);
  const list = channels.data ?? opened?.channels ?? [];
  const content = useContents(workspaceId, list, selected, opened?.form);
  const stored = opened?.post.destinations ?? [];
  const plan = withSources(toPlan(list, content, selected, stored), sources);
  const fingerprint = opened === undefined ? '' : formFingerprint(planInput(plan, content));
  const [start] = useState(() =>
    opened === undefined ? undefined : { post: opened.post, fingerprint },
  );
  const changed =
    start === undefined
      ? selected.size > 0 || !isEmpty(content.contents.base)
      : fingerprint !== start.fingerprint;
  const dirty = changed || !sameTags(tags, opened?.post.tags ?? []);
  const tagField = { value: tags, set: setTags, creating, setCreating };
  const picks = { sources, setSources };
  return {
    channels,
    list,
    selected,
    setSelected,
    picks,
    content,
    plan,
    tags: tagField,
    start,
    dirty,
  };
}

export function useComposeForm(workspaceId: string, start: ComposeStart = {}) {
  const { channels, list, selected, setSelected, content, plan, ...form } = useOpenedForm(
    workspaceId,
    start.opened,
  );
  const { run, failure } = usePublishing(workspaceId, start.onDone, form);
  const approval = useApprovalMode(workspaceId, failure, planBrands(list, plan));
  const { when, whenChanged } = useOpenedWhen(start, approval.request);
  const repeat = useRepeatControl(when.date);
  const [formError, setFormError] = useState<string | null>(null);
  const [limitFlags, setLimitFlags] = useState<readonly string[]>([]);
  const pending = run.isPending;
  const { locale } = useLocale();
  const flagged = [...limitFlags, ...content.unusable];
  const gone = goneProblem(start.opened?.post.destinations ?? [], list, selected, locale);
  const blocked = flagged.length > 0 || gone !== null;
  const queue = usePlanQueue(workspaceId, list, plan);
  const requesting = approval.request && when.mode !== 'draft';
  const send = (asRequest: boolean) => {
    if (pending || blocked || form.tags.creating) return;
    const empty = emptyProblem(plan, content.contents.base);
    if (empty !== null) return setFormError(empty);
    const waiting = videoProblem(plan, content.contents.base, content.videos, locale);
    if (waiting !== null) return setFormError(waiting);
    if (when.mode === 'queue' && queue.empty !== undefined) {
      return setFormError(m.compose_queue_empty({ channel: queue.empty.displayName }));
    }
    const resolved = resolveFull(when, repeat);
    if ('problem' in resolved) return setFormError(resolved.problem);
    setFormError(null);
    run.mutate({
      ...planInput(plan, content),
      tags: form.tags.value.map((tag) => tag.id),
      when: resolved.when,
      request: asRequest ? { note: approval.note.value } : null,
    });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(requesting);
  };
  const requestInstead = () => {
    approval.force();
    send(true);
  };

  return {
    channels,
    list,
    content,
    selected,
    setSelected,
    picks: form.picks,
    tags: form.tags,
    when,
    repeat,
    formError: gone ?? formError,
    blocked,
    flagged,
    setLimitFlags,
    failure,
    pending,
    onSubmit,
    approval: { ...approval, requesting, offer: approval.offer && when.mode !== 'draft' },
    requestInstead,
    queue,
    dirty: form.dirty || whenChanged,
  };
}
