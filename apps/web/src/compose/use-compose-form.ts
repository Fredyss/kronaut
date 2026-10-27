import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { type Channel, channelsQuery, errorCode, postKey, postsKey } from '../api.ts';
import { approvalPolicyQuery, approvalRequired } from '../approvals/queries.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { choiceFor } from './choice.ts';
import { type Content, type Contents, effective } from './contents.ts';
import { isBlank } from './doc.ts';
import {
  type ComposeContent,
  type ComposeDestination,
  type ComposeInput,
  createSubmitter,
  SubmitError,
} from './submit.ts';
import { useContents } from './use-contents.ts';
import { resolveWhen, useWhen } from './when.ts';

function usePublish(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submit] = useState(() => createSubmitter(client, workspaceId));
  const run = useMutation({
    mutationFn: (input: ComposeInput) => submit(input),
    onSuccess: async (post) => {
      await queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) });
      queryClient.setQueryData(postKey(workspaceId, post.id), post);
      await navigate({ to: '/posts/$postId', params: { postId: post.id } });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) }),
  });
  const failure =
    run.error === null || run.error instanceof SubmitError
      ? run.error
      : new SubmitError('create', run.error, []);
  return { run, failure };
}

interface Plan {
  readonly destinations: ComposeDestination[];
  readonly variants: { readonly channel: Channel; readonly content: Content }[];
  readonly usesDefault: boolean;
}

function toPlan(list: readonly Channel[], contents: Contents, selected: ReadonlySet<string>): Plan {
  const plan: Plan = { destinations: [], variants: [], usesDefault: false };
  for (const channel of list) {
    const content = effective(contents, channel.id);
    const choice = choiceFor(
      channel,
      content.images.map((image) => image.file),
    );
    if (choice.kind !== 'ok' || !selected.has(channel.id)) continue;
    const custom = contents.customized.has(channel.id);
    if (custom) plan.variants.push({ channel, content });
    const variant = custom ? plan.variants.length - 1 : null;
    plan.destinations.push({ accountId: channel.id, publishType: choice.publishType, variant });
  }
  return { ...plan, usesDefault: plan.destinations.some((d) => d.variant === null) };
}

function isEmpty(content: Content): boolean {
  return isBlank(content.doc) && content.images.length === 0;
}

function emptyProblem(plan: Plan, base: Content): string | null {
  if (plan.destinations.length === 0) return m.compose_error_no_channel();
  if (plan.usesDefault && isEmpty(base)) return m.compose_error_empty();
  const empty = plan.variants.find(({ content }) => isEmpty(content));
  return empty === undefined
    ? null
    : m.compose_error_empty_channel({ channel: empty.channel.displayName });
}

function toCompose({ doc, images }: Content): ComposeContent {
  return {
    doc,
    images: images.map(({ id, file, altText, aiGenerated }) => ({
      id,
      file,
      altText,
      aiGenerated,
    })),
  };
}

function useApprovalMode(workspaceId: string, failure: SubmitError | null) {
  const client = useApiClient();
  const policy = useQuery(approvalPolicyQuery(client, workspaceId));
  const [forced, setForced] = useState(false);
  const [note, setNote] = useState('');
  const request = forced || approvalRequired(policy.data, null);
  const offer =
    !request && failure?.step === 'schedule' && errorCode(failure.cause) === 'approval_required';
  return { request, offer, force: () => setForced(true), note: { value: note, set: setNote } };
}

export function useComposeForm(workspaceId: string, at?: string) {
  const client = useApiClient();
  const channels = useQuery(channelsQuery(client, workspaceId));
  const { run, failure } = usePublish(workspaceId);
  const approval = useApprovalMode(workspaceId, failure);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const when = useWhen(at);
  const { mode, date, time, tz } = when;
  const [formError, setFormError] = useState<string | null>(null);
  const [limitFlags, setLimitFlags] = useState<readonly string[]>([]);
  const pending = run.isPending;
  const list = channels.data ?? [];
  const content = useContents(list, selected);
  const flagged = [...limitFlags, ...content.unusable];
  const blocked = flagged.length > 0;
  const plan = toPlan(list, content.contents, selected);

  const send = (asRequest: boolean) => {
    if (pending || blocked) return;
    const empty = emptyProblem(plan, content.contents.base);
    if (empty !== null) return setFormError(empty);
    const resolved = resolveWhen(mode, date, time, tz);
    if ('problem' in resolved) return setFormError(resolved.problem);
    setFormError(null);
    run.mutate({
      content: toCompose(content.contents.base),
      variants: plan.variants.map((variant) => toCompose(variant.content)),
      destinations: plan.destinations,
      when: resolved.when,
      request: asRequest ? { note: approval.note.value } : null,
    });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(approval.request);
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
    when,
    formError,
    blocked,
    flagged,
    setLimitFlags,
    failure,
    pending,
    onSubmit,
    approval,
    requestInstead,
  };
}
