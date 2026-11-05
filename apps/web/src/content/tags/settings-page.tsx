import { tagsDelete, tagsUpdate } from '@kronaut/sdk';
import {
  Button,
  ConfirmDelete,
  focusNeighbour,
  Select,
  SettingsCard,
  SettingsPage,
  toast,
} from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { NameField } from '../../base/ui/name-field.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { postsKey } from '../../records/posts/queries.ts';
import {
  TAG_COLORS,
  TAG_NAME_MAX,
  type Tag,
  type TagColor,
  TagDots,
  tagError,
  tagsKey,
  tagsQuery,
} from './picker.tsx';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

interface TagChange {
  readonly name?: string;
  readonly color?: TagColor;
}

function reportFailure(error: unknown): void {
  if (errorStatus(error) !== 401) toast(tagError(error), 'destructive');
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

function EditableRow({ workspaceId, tag }: { readonly workspaceId: string; readonly tag: Tag }) {
  const row = useRef<HTMLLIElement>(null);
  const { update, remove } = useTagWrites(workspaceId, tag.id, () => focusNeighbour(row.current));
  const [asking, setAsking] = useState(false);
  return (
    <li ref={row} className="flex flex-wrap items-center gap-3 px-6 py-3">
      <TagDots tags={[tag]} />
      <NameField
        name={tag.name}
        label={settingsText.settings_tag_name({ name: tag.name })}
        maxLength={TAG_NAME_MAX}
        onRename={(name, onRefused) => update.mutate({ name }, { onError: onRefused })}
      />
      <Select
        aria-label={settingsText.settings_tag_color_of({ name: tag.name })}
        value={tag.color}
        onChange={(event) => update.mutate({ color: event.currentTarget.value as TagColor })}
      >
        {TAG_COLORS.map((color) => (
          <option key={color} value={color}>
            {settingsText.settings_tag_color({ color })}
          </option>
        ))}
      </Select>
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
        <ConfirmDelete
          title={settingsText.settings_tag_delete_title({ name: tag.name })}
          body={settingsText.settings_tag_delete_body({ count: tag.postCount })}
          keepLabel={settingsText.settings_tag_keep()}
          confirmLabel={settingsText.settings_tag_delete_confirm()}
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
