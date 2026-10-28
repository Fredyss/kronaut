import {
  type ChainLink,
  ProviderFailure,
  type PublishInput,
  type PublishItem,
} from '@kronaut/core';

export type ItemPath =
  | { readonly kind: 'main'; readonly item: PublishItem }
  | {
      readonly kind: 'reply';
      readonly item: PublishItem;
      readonly parent: ChainLink;
      readonly chain: readonly ChainLink[];
    };

export interface CommentPath {
  readonly kind: 'comment';
  readonly item: PublishItem;
  readonly main: ChainLink;
}

export type AnyItemPath = ItemPath | CommentPath;

type ItemInput = Pick<PublishInput<unknown, unknown>, 'items' | 'chain'>;

function permanentItem(code: string): ProviderFailure {
  return new ProviderFailure({ kind: 'permanent', code });
}

function commentPath(item: PublishItem, chain: readonly ChainLink[]): CommentPath {
  const main = chain.find((link) => link.position === 0);
  if (main === undefined || main.remoteId === '') throw permanentItem('comment_parent_missing');
  if (item.media.length > 0) throw permanentItem('comment_media_unsupported');
  if (item.text.trim() === '') throw permanentItem('text_empty');
  return { kind: 'comment', item, main };
}

export function itemPath(input: ItemInput): ItemPath;
export function itemPath(input: ItemInput, options: { readonly comments: true }): AnyItemPath;
export function itemPath(input: ItemInput, options?: { readonly comments: true }): AnyItemPath {
  const [item, ...rest] = input.items;
  if (item === undefined) throw permanentItem('item_missing');
  if (rest.length > 0) throw permanentItem('item_multiple');
  const chain = input.chain ?? [];
  if (item.role === 'comment') {
    if (options?.comments !== true) throw permanentItem('comment_unsupported');
    return commentPath(item, chain);
  }
  if (item.role === 'main') return { kind: 'main', item };
  if (item.media.length > 0) throw permanentItem('reply_media_unsupported');
  const parent = chain.at(-1);
  if (parent === undefined || parent.remoteId === '') throw permanentItem('reply_parent_missing');
  return { kind: 'reply', item, parent, chain };
}

export function hasComment(input: Pick<ItemInput, 'items'>): boolean {
  return input.items.some((item) => item.role === 'comment');
}

export function commentOf(input: ItemInput): CommentPath | undefined {
  if (!hasComment(input)) return undefined;
  const path = itemPath(input, { comments: true });
  return path.kind === 'comment' ? path : undefined;
}

const NO_REPLY_MEDIA = {
  minCount: 0,
  maxCount: 0,
  mixed: false,
  altText: { supported: false, required: false, maxLength: 0 },
  aiLabel: false,
} as const;

export const REPLY_THREAD = { maxItems: 24, media: NO_REPLY_MEDIA } as const;
