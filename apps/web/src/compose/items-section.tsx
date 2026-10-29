import { Button } from '@kronaut/ui';
import { lazy, Suspense, useId } from 'react';
import type { Channel } from '../api.ts';
import { m as composeText } from '../i18n/compose.ts';
import { m } from '../i18n.ts';
import { effective } from './contents.ts';
import type { Doc } from './doc.ts';
import { type LimitItem, mainOnly, postTypeFor } from './items.ts';
import { loadEditor, loadTextLimits } from './load.ts';
import type { LimitTarget } from './text-limits.tsx';
import type { ContentsState } from './use-contents.ts';

const PostEditor = lazy(loadEditor);
const ItemCounters = lazy(() =>
  loadTextLimits().then((module) => ({ default: module.ItemCounters })),
);

export function EditorFallback() {
  return (
    <div className="min-h-40 rounded-md border px-3 py-2 text-muted-foreground text-sm">
      {m.loading()}
    </div>
  );
}

interface ItemEditorProps {
  readonly id: string;
  readonly label: string;
  readonly removeLabel: string;
  readonly item: LimitItem;
  readonly initial: Doc;
  readonly pending: boolean;
  readonly targets: readonly LimitTarget[];
  readonly onChange: (doc: Doc) => void;
  readonly onRemove: () => void;
}

function ItemEditor(props: ItemEditorProps) {
  const { id, label, removeLabel, item, initial, pending, targets, onChange, onRemove } = props;
  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-sm">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={removeLabel}
          onClick={onRemove}
        >
          {m.compose_image_remove()}
        </Button>
      </div>
      <Suspense fallback={<EditorFallback />}>
        <PostEditor
          id={id}
          label={label}
          disabled={pending}
          initial={initial}
          onChange={onChange}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ItemCounters targets={targets} item={item} />
      </Suspense>
    </li>
  );
}

interface ItemsSectionProps {
  readonly state: ContentsState;
  readonly targets: readonly LimitTarget[];
  readonly pending: boolean;
}

export function ItemsSection({ state, targets, pending }: ItemsSectionProps) {
  const prefix = useId();
  const { items } = state;
  const tab = state.active ?? '';
  const { comment } = items;
  const shared = { pending, targets };
  if (items.replies.length === 0 && comment === null && !items.canReply && !items.canComment) {
    return null;
  }
  return (
    <div className="flex flex-col gap-4">
      {items.replies.length === 0 && comment === null ? null : (
        <ol className="flex flex-col gap-6">
          {items.replies.map((reply, index) => (
            <ItemEditor
              key={`${tab}-${reply.id}`}
              {...shared}
              id={`${prefix}-${reply.id}`}
              label={composeText.compose_reply_label({ position: index + 1 })}
              removeLabel={composeText.compose_remove_reply({ position: index + 1 })}
              item={{ kind: 'thread', position: index + 1 }}
              initial={reply.doc}
              onChange={(doc) => items.setReply(reply.id, doc)}
              onRemove={() => items.removeReply(reply.id)}
            />
          ))}
          {comment === null ? null : (
            <ItemEditor
              key={`${tab}-comment`}
              {...shared}
              id={`${prefix}-comment`}
              label={composeText.compose_comment_label()}
              removeLabel={composeText.compose_remove_comment()}
              item={{ kind: 'comment' }}
              initial={comment.doc}
              onChange={items.setComment}
              onRemove={items.removeComment}
            />
          )}
        </ol>
      )}
      {items.canReply || items.canComment ? (
        <div className="flex flex-wrap gap-2">
          {items.canReply ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={items.addReply}
            >
              {composeText.compose_add_reply()}
            </Button>
          ) : null}
          {items.canComment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={items.addComment}
            >
              {composeText.compose_add_comment()}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function mainOnlyChannels(state: ContentsState): Channel[] {
  return state.tabs.filter((channel) => {
    if (state.active !== null && channel.id !== state.active) return false;
    const postType = postTypeFor(channel, state.mediaFor(channel.id));
    return postType !== undefined && mainOnly(postType, effective(state.contents, channel.id));
  });
}

export function MainOnlyNotes({ state }: { readonly state: ContentsState }) {
  const channels = mainOnlyChannels(state);
  if (channels.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
      {channels.map((channel) => (
        <li key={channel.id}>{composeText.compose_main_only({ channel: channel.displayName })}</li>
      ))}
    </ul>
  );
}
