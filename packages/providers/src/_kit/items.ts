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

function permanentItem(code: string): ProviderFailure {
  return new ProviderFailure({ kind: 'permanent', code });
}

export function itemPath(input: Pick<PublishInput<unknown, unknown>, 'items' | 'chain'>): ItemPath {
  const [item, ...rest] = input.items;
  if (item === undefined) throw permanentItem('item_missing');
  if (rest.length > 0) throw permanentItem('item_multiple');
  if (item.role === 'comment') throw permanentItem('comment_unsupported');
  if (item.role === 'main') return { kind: 'main', item };
  if (item.media.length > 0) throw permanentItem('reply_media_unsupported');
  const chain = input.chain ?? [];
  const parent = chain.at(-1);
  if (parent === undefined || parent.remoteId === '') throw permanentItem('reply_parent_missing');
  return { kind: 'reply', item, parent, chain };
}

const NO_REPLY_MEDIA = {
  minCount: 0,
  maxCount: 0,
  mixed: false,
  altText: { supported: false, required: false, maxLength: 0 },
  aiLabel: false,
} as const;

export const REPLY_THREAD = { maxItems: 24, media: NO_REPLY_MEDIA } as const;
