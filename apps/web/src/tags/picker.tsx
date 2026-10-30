import { postsTagsReplace, tagsCreate } from '@kronaut/sdk';
import { cn, Label, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { errorStatus, type Post, postsKey } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import { TagDot } from './dots.tsx';
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

function useCreateTag(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const body = { name, color: FIRST_COLOR };
      const headers = idempotency(keyFor(null, name));
      return (await tagsCreate({ client, path: { workspaceId }, body, headers })).data;
    },
    onError: reportFailure,
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

function optionKey(option: TagOption): string {
  return option.kind === 'tag' ? option.tag.id : `create:${option.name}`;
}

interface OptionsProps {
  readonly id: string;
  readonly options: readonly TagOption[];
  readonly active: number;
  onPick(option: TagOption): void;
}

function Options({ id, options, active, onPick }: OptionsProps) {
  return (
    <div
      id={id}
      role="listbox"
      tabIndex={-1}
      aria-label={m.tags_label()}
      className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground text-sm shadow-md"
    >
      {options.length === 0 ? (
        <p className="px-2 py-1 text-muted-foreground">{m.tags_no_match()}</p>
      ) : null}
      {options.map((option, index) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: the input owns the keyboard (aria-activedescendant).
        <div
          key={optionKey(option)}
          id={`${id}-${index}`}
          role="option"
          tabIndex={-1}
          aria-selected={index === active}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(option)}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1',
            index === active && 'bg-accent text-accent-foreground',
          )}
        >
          {option.kind === 'tag' ? <TagDot color={option.tag.color} /> : null}
          <span className="truncate">
            {option.kind === 'tag' ? option.tag.name : m.tags_create({ name: option.name })}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface TagPickerProps {
  readonly workspaceId: string;
  readonly value: readonly PostTag[];
  onChange(tags: readonly PostTag[]): void;
  readonly editable: boolean;
  readonly disabled?: boolean | undefined;
}

function TagInput({ workspaceId, value, onChange, disabled = false }: TagPickerProps) {
  const client = useApiClient();
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const tags = useQuery(tagsQuery(client, workspaceId));
  const create = useCreateTag(workspaceId);
  const options = tagOptions(tags.data ?? [], value, query);

  const pick = (option: TagOption) => {
    setQuery('');
    setActive(0);
    if (option.kind === 'tag') return onChange([...value, option.tag]);
    create.mutate(option.name, { onSuccess: (tag) => onChange([...value, tag]) });
  };
  const step = (by: number) => {
    setOpen(true);
    if (options.length > 0) setActive((active + by + options.length) % options.length);
  };
  const keys: Readonly<Record<string, () => void>> = {
    ArrowDown: () => step(1),
    ArrowUp: () => step(-1),
    Enter: () => {
      const option = options[active];
      if (option !== undefined && !create.isPending) pick(option);
    },
    Escape: () => setOpen(false),
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && query === '') onChange(value.slice(0, -1));
    const key = keys[event.key];
    if (key === undefined || (event.key === 'Escape' && !open)) return;
    event.preventDefault();
    event.stopPropagation();
    key();
  };
  const shown = open && !disabled && (options.length > 0 || query !== '');
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
        autoComplete="off"
        maxLength={TAG_NAME_MAX}
        disabled={disabled}
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      />
      {shown ? <Options id={listId} options={options} active={active} onPick={pick} /> : null}
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
      {editable && value.length < MAX_POST_TAGS ? <TagInput {...props} /> : null}
      {editable && value.length >= MAX_POST_TAGS ? (
        <p className="text-muted-foreground text-sm">{m.tags_full({ count: MAX_POST_TAGS })}</p>
      ) : null}
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
