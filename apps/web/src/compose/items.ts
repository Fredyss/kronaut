import type { Channel } from '../api.ts';
import { choiceFor, type MediaFacts } from './choice.ts';
import type { Content, Reply } from './contents.ts';
import { type Doc, EMPTY_DOC } from './doc.ts';

export const MAX_REPLIES = 24;

export type PostTypeRules = Channel['postTypes'][number];

export function postTypeFor(channel: Channel, media: MediaFacts): PostTypeRules | undefined {
  const choice = choiceFor(channel, media);
  if (choice.kind !== 'ok') return undefined;
  return channel.postTypes.find((candidate) => candidate.id === choice.publishType);
}

export type LimitItem =
  | { readonly kind: 'thread'; readonly position: number }
  | { readonly kind: 'comment' };

export interface ItemDoc {
  readonly item: LimitItem;
  readonly doc: Doc;
}

export function itemDocs({ replies, comment }: Content): ItemDoc[] {
  const threads = replies.map(
    (reply, index): ItemDoc => ({ item: { kind: 'thread', position: index + 1 }, doc: reply.doc }),
  );
  return comment === null ? threads : [...threads, { item: { kind: 'comment' }, doc: comment.doc }];
}

export interface ItemSupport {
  readonly maxReplies: number;
  readonly comment: boolean;
}

export function itemSupport(rules: readonly (PostTypeRules | undefined)[]): ItemSupport {
  const max = Math.max(0, ...rules.map((postType) => postType?.thread?.maxItems ?? 0));
  return {
    maxReplies: Math.min(MAX_REPLIES, max),
    comment: rules.some((postType) => Boolean(postType?.comment)),
  };
}

export function mainOnly(postType: PostTypeRules, content: Content): boolean {
  return (
    (content.replies.length > 0 && !postType.thread) ||
    (content.comment !== null && !postType.comment)
  );
}

type Edit = (change: (content: Content) => Content) => void;

export function itemsState(content: Content, edit: Edit, support: ItemSupport) {
  const { replies, comment } = content;
  const withReplies = (change: (replies: readonly Reply[]) => readonly Reply[]) =>
    edit((c) => ({ ...c, replies: change(c.replies) }));
  return {
    replies,
    comment,
    canReply: replies.length < support.maxReplies,
    canComment: support.comment && comment === null,
    addReply: () => withReplies((list) => [...list, { id: crypto.randomUUID(), doc: EMPTY_DOC }]),
    setReply: (id: string, doc: Doc) =>
      withReplies((list) => list.map((reply) => (reply.id === id ? { ...reply, doc } : reply))),
    removeReply: (id: string) => withReplies((list) => list.filter((reply) => reply.id !== id)),
    addComment: () => edit((c) => ({ ...c, comment: { doc: EMPTY_DOC } })),
    setComment: (doc: Doc) => edit((c) => (c.comment === null ? c : { ...c, comment: { doc } })),
    removeComment: () => edit((c) => ({ ...c, comment: null })),
  };
}

export type ItemsState = ReturnType<typeof itemsState>;
