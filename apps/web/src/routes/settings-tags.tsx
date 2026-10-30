import { tagsDelete, tagsUpdate } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { errorStatus, meQuery, postsKey } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { m } from '../i18n.ts';
import { idempotency, keyFor } from '../idempotency.ts';
import { SELECT } from '../locale-select.tsx';
import { SettingsCard, SettingsPage } from '../settings/card.tsx';
import {
  TAG_COLORS,
  TAG_NAME_MAX,
  type Tag,
  type TagColor,
  TagDots,
  tagError,
  tagsKey,
  tagsQuery,
} from '../tags/picker.tsx';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

interface TagChange {
  readonly name?: string;
  readonly color?: TagColor;
}

function reportFailure(error: unknown): void {
  if (errorStatus(error) !== 401) toast(tagError(error), 'destructive');
}

function focusNeighbour(row: HTMLElement | null): void {
  const sibling = row?.nextElementSibling ?? row?.previousElementSibling;
  const target = sibling?.querySelector('button') ?? row?.closest<HTMLElement>('[tabindex="-1"]');
  target?.focus();
}

function useTagWrites(workspaceId: string, tagId: string, onDeleted: () => void) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const path = { workspaceId, tagId };
  const settled = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: tagsKey(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) }),
    ]);
  const update = useMutation({
    mutationFn: async (body: TagChange) => {
      const headers = idempotency(keyFor(null, tagId));
      await tagsUpdate({ client, path, body, headers });
    },
    onSuccess: () => toast(settingsText.settings_tag_saved()),
    onError: reportFailure,
    onSettled: settled,
  });
  const remove = useMutation({
    mutationFn: async () => {
      const headers = idempotency(keyFor(null, tagId));
      await tagsDelete({ client, path, headers });
    },
    onSuccess: () => {
      toast(settingsText.settings_tag_deleted());
      onDeleted();
    },
    onError: reportFailure,
    onSettled: settled,
  });
  return { update, remove };
}

function NameField({
  tag,
  onRename,
}: {
  readonly tag: Tag;
  onRename(name: string, onRefused: () => void): void;
}) {
  const [name, setName] = useState(tag.name);
  const [stored, setStored] = useState(tag.name);
  const sent = useRef<string | null>(null);
  if (stored !== tag.name) {
    setStored(tag.name);
    setName(tag.name);
  }
  const commit = () => {
    const next = name.normalize('NFC').trim();
    if (next === '' || next === tag.name) return setName(tag.name);
    if (next === sent.current) return;
    sent.current = next;
    setName(next);
    onRename(next, () => {
      sent.current = null;
      setName(tag.name);
    });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit();
  };
  return (
    <input
      aria-label={settingsText.settings_tag_name({ name: tag.name })}
      value={name}
      maxLength={TAG_NAME_MAX}
      onChange={(event) => setName(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
    />
  );
}

function DeleteTag({
  tag,
  pending,
  onCancel,
  onConfirm,
}: {
  readonly tag: Tag;
  readonly pending: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    keep.current?.focus();
    return () => {
      if (opener?.isConnected === true) opener.focus();
    };
  }, []);
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
      className="flex basis-full flex-col gap-3 rounded-md border p-4"
    >
      <h3 id={titleId} className="font-medium text-sm">
        {settingsText.settings_tag_delete_title({ name: tag.name })}
      </h3>
      <p id={bodyId} className="text-muted-foreground text-sm">
        {settingsText.settings_tag_delete_body({ count: tag.postCount })}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button ref={keep} type="button" variant="ghost" onClick={onCancel}>
          {settingsText.settings_tag_keep()}
        </Button>
        <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
          {settingsText.settings_tag_delete_confirm()}
        </Button>
      </div>
    </div>
  );
}

function EditableRow({ workspaceId, tag }: { readonly workspaceId: string; readonly tag: Tag }) {
  const row = useRef<HTMLLIElement>(null);
  const { update, remove } = useTagWrites(workspaceId, tag.id, () => focusNeighbour(row.current));
  const [asking, setAsking] = useState(false);
  return (
    <li ref={row} className="flex flex-wrap items-center gap-3 px-6 py-3">
      <TagDots tags={[tag]} />
      <NameField
        tag={tag}
        onRename={(name, onRefused) => update.mutate({ name }, { onError: onRefused })}
      />
      <select
        aria-label={settingsText.settings_tag_color_of({ name: tag.name })}
        value={tag.color}
        onChange={(event) => update.mutate({ color: event.currentTarget.value as TagColor })}
        className={SELECT}
      >
        {TAG_COLORS.map((color) => (
          <option key={color} value={color}>
            {settingsText.settings_tag_color({ color })}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground text-sm tabular-nums">
        {settingsText.settings_tag_posts({ count: tag.postCount })}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={settingsText.settings_tag_delete({ name: tag.name })}
        onClick={() => setAsking(true)}
      >
        {settingsText.settings_tag_delete_confirm()}
      </Button>
      {asking ? (
        <DeleteTag
          tag={tag}
          pending={remove.isPending}
          onCancel={() => setAsking(false)}
          onConfirm={() => remove.mutate(undefined, { onSettled: () => setAsking(false) })}
        />
      ) : null}
    </li>
  );
}

function ReadOnlyRow({ tag }: { readonly tag: Tag }) {
  return (
    <li className="flex items-center gap-3 px-6 py-3 text-sm">
      <TagDots tags={[tag]} />
      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
      <span className="text-muted-foreground tabular-nums">
        {settingsText.settings_tag_posts({ count: tag.postCount })}
      </span>
    </li>
  );
}

function TagList({ workspaceId, role }: { readonly workspaceId: string; readonly role: string }) {
  const client = useApiClient();
  const tags = useQuery(tagsQuery(client, workspaceId));
  if (tags.data === undefined) {
    return tags.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  if (tags.data.length === 0) {
    return <p className="text-muted-foreground text-sm">{settingsText.settings_tags_empty()}</p>;
  }
  const editable = EDITORS.has(role);
  return (
    <>
      {editable ? null : (
        <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>
      )}
      <SettingsCard title={settingsText.settings_tags_title()}>
        <ul className="flex flex-col divide-y">
          {tags.data.map((tag) =>
            editable ? (
              <EditableRow key={tag.id} workspaceId={workspaceId} tag={tag} />
            ) : (
              <ReadOnlyRow key={tag.id} tag={tag} />
            ),
          )}
        </ul>
      </SettingsCard>
    </>
  );
}

export function TagSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={settingsText.settings_tags_title()}
      intro={settingsText.settings_tags_intro()}
    >
      <div tabIndex={-1} className="flex flex-col gap-6 outline-none">
        {workspace === undefined ? null : (
          <TagList workspaceId={workspace.id} role={workspace.role} />
        )}
      </div>
    </SettingsPage>
  );
}
