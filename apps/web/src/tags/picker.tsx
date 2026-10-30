import { postsTagsReplace, tagsCreate } from '@kronaut/sdk';
import { Label, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { detailCodes, errorStatus, type Post, postsKey } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import { TagDot } from './dots.tsx';
import { Options } from './options.tsx';
import {
  FIRST_COLOR,
  MAX_POST_TAGS,
  type PostTag,
  TAG_NAME_MAX,
  type TagOption,
  tagError,
  tagOptions,
  tagsKey,
  tagsQuery,
} from './tags.ts';

// Routes import tag code from here, not its files, so it all stays in this one budgeted chunk.
export { TagDots } from './dots.tsx';
export {
  TAG_COLORS,
  TAG_NAME_MAX,
  type Tag,
  type TagColor,
  tagError,
  tagsKey,
  tagsQuery,
} from './tags.ts';

function reportFailure(error: unknown): void {
  if (errorStatus(error) !== 401) toast(tagError(error), 'destructive');
}

function reportCreateFailure(error: unknown): void {
  if (detailCodes(error).includes('out_of_scope')) toast(m.tags_out_of_scope(), 'destructive');
  else reportFailure(error);
}

function useCreateTag(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const body = { name, color: FIRST_COLOR };
      const headers = idempotency(keyFor(null, name));
      return (await tagsCreate({ client, path: { workspaceId }, body, headers })).data;
    },
    onError: reportCreateFailure,
    onSettled: () => queryClient.invalidateQueries({ queryKey: tagsKey(workspaceId) }),
  });
}

function Chip({
  tag,
  onRemove,
}: {
  readonly tag: PostTag;
  readonly onRemove: (() => void) | undefined;
}) {
  return (
    <li className="flex max-w-full items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-sm">
      <TagDot color={tag.color} />
      <span className="truncate">{tag.name}</span>
      {onRemove === undefined ? null : (
        <button
          type="button"
          aria-label={m.tags_remove({ name: tag.name })}
          onClick={onRemove}
          className="rounded-full px-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </li>
  );
}

export interface TagPickerProps {
  readonly workspaceId: string;
  readonly value: readonly PostTag[];
  onChange(tags: readonly PostTag[]): void;
  onCreating?(creating: boolean): void;
  readonly editable: boolean;
  readonly disabled?: boolean | undefined;
}

function useTagInput({
  workspaceId,
  value,
  onChange,
  onCreating,
  disabled = false,
}: TagPickerProps) {
  const client = useApiClient();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const tags = useQuery(tagsQuery(client, workspaceId));
  const create = useCreateTag(workspaceId);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => onCreating?.(create.isPending), [create.isPending, onCreating]);
  const full = value.length >= MAX_POST_TAGS;
  const options = tagOptions(tags.data ?? [], value, query);
  const shown = open && !disabled && !full && (options.length > 0 || query !== '');

  const addCreated = (tag: PostTag) => {
    if (latest.current.length < MAX_POST_TAGS) onChange([...latest.current, tag]);
  };
  const pick = (option: TagOption) => {
    if (option.kind === 'create' && create.isPending) return;
    setQuery('');
    setActive(0);
    if (option.kind === 'tag') return onChange([...value, option.tag]);
    create.mutate(option.name, { onSuccess: addCreated });
  };
  const step = (by: number) => {
    setOpen(true);
    if (options.length > 0) setActive((active + by + options.length) % options.length);
  };
  const removeLast = (event: KeyboardEvent<HTMLInputElement>) => {
    if (query === '' && !event.repeat && value.length > 0) onChange(value.slice(0, -1));
  };
  const keys: Readonly<Record<string, () => void>> = {
    ArrowDown: () => step(1),
    ArrowUp: () => step(-1),
    Enter: () => {
      const option = options[active];
      if (shown && option !== undefined) pick(option);
    },
    Escape: () => setOpen(false),
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') return removeLast(event);
    const key = keys[event.key];
    if (key === undefined || (event.key === 'Escape' && !shown)) return;
    event.preventDefault();
    event.stopPropagation();
    key();
  };
  const onQuery = (next: string) => {
    setQuery(next);
    setActive(0);
    setOpen(true);
  };
  return { query, onQuery, setOpen, active, options, shown, full, pick, onKeyDown };
}

function TagInput(props: TagPickerProps) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const { query, onQuery, setOpen, active, options, shown, full, pick, onKeyDown } =
    useTagInput(props);
  return (
    <div className="relative flex flex-col gap-2">
      <Label htmlFor={id}>{m.tags_add()}</Label>
      <input
        id={id}
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && options.length > 0 ? `${listId}-${active}` : undefined}
        aria-describedby={full ? hintId : undefined}
        autoComplete="off"
        maxLength={TAG_NAME_MAX}
        disabled={props.disabled}
        readOnly={full}
        value={query}
        onChange={(event) => onQuery(event.currentTarget.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      />
      {shown ? <Options id={listId} options={options} active={active} onPick={pick} /> : null}
      {full ? (
        <p id={hintId} className="text-muted-foreground text-sm">
          {m.tags_full({ count: MAX_POST_TAGS })}
        </p>
      ) : null}
    </div>
  );
}

export function TagPicker(props: TagPickerProps) {
  const { value, onChange, editable, disabled = false } = props;
  const remove = (id: string) => onChange(value.filter((tag) => tag.id !== id));
  return (
    <section aria-label={m.tags_label()} className="flex flex-col gap-2">
      <h2 className="font-medium text-sm">{m.tags_label()}</h2>
      {value.length === 0 && !editable ? (
        <p className="text-muted-foreground text-sm">{m.tags_none()}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Chip
              key={tag.id}
              tag={tag}
              onRemove={editable && !disabled ? () => remove(tag.id) : undefined}
            />
          ))}
        </ul>
      )}
      {editable ? <TagInput {...props} /> : null}
    </section>
  );
}

export function PostTags({
  workspaceId,
  post,
  editable,
}: {
  readonly workspaceId: string;
  readonly post: Post;
  readonly editable: boolean;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  const save = useMutation({
    scope: { id: `post-tags:${post.id}` },
    mutationFn: async (tags: readonly PostTag[]) => {
      const postId = post.id;
      const body = { tagIds: tags.map((tag) => tag.id) };
      keyed.current = keyFor(keyed.current, JSON.stringify({ postId, body }));
      const headers = idempotency(keyed.current);
      await postsTagsReplace({ client, path: { workspaceId, postId }, body, headers });
    },
    onSuccess: () => {
      keyed.current = null;
    },
    onError: (error) => {
      if (errorStatus(error) !== null) keyed.current = null;
      reportFailure(error);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: tagsKey(workspaceId) }),
      ]),
  });
  return (
    <TagPicker
      workspaceId={workspaceId}
      value={save.isPending ? (save.variables ?? post.tags) : post.tags}
      onChange={save.mutate}
      editable={editable}
    />
  );
}
