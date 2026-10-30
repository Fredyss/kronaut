import { type Client, type TagsListResponse, tagsList } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { errorCode, type Post } from '../api.ts';
import { apiErrorMessage, m } from '../i18n.ts';

export type PostTag = Post['tags'][number];
export type Tag = TagsListResponse['items'][number];
export type TagColor = PostTag['color'];

export const MAX_POST_TAGS = 20;
export const TAG_NAME_MAX = 40;

export const TAG_DOT: Readonly<Record<TagColor, string>> = {
  slate: 'bg-tag-slate',
  red: 'bg-tag-red',
  orange: 'bg-tag-orange',
  amber: 'bg-tag-amber',
  green: 'bg-tag-green',
  teal: 'bg-tag-teal',
  blue: 'bg-tag-blue',
  violet: 'bg-tag-violet',
};

export const TAG_COLORS = Object.keys(TAG_DOT) as readonly TagColor[];
export const FIRST_COLOR: TagColor = 'slate';

export function tagsKey(workspaceId: string) {
  return ['tags', workspaceId] as const;
}

export function tagsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: tagsKey(workspaceId),
    queryFn: async () => (await tagsList({ client, path: { workspaceId } })).data.items,
  });
}

export function tagError(error: unknown): string {
  const code = errorCode(error);
  if (code === 'tag_exists') return m.tags_exists();
  return code === 'tag_limit' ? m.tags_limit() : apiErrorMessage(code);
}

function folded(text: string): string {
  return text.normalize('NFC').trim().toLocaleLowerCase();
}

export type TagOption =
  | { readonly kind: 'tag'; readonly tag: Tag }
  | { readonly kind: 'create'; readonly name: string };

export function tagOptions(
  all: readonly Tag[],
  chosen: readonly PostTag[],
  query: string,
): TagOption[] {
  const wanted = folded(query);
  const taken = new Set(chosen.map((tag) => tag.id));
  const options = all
    .filter((tag) => !taken.has(tag.id) && folded(tag.name).includes(wanted))
    .sort((a, b) => Number(folded(b.name) === wanted) - Number(folded(a.name) === wanted))
    .map((tag): TagOption => ({ kind: 'tag', tag }));
  const exact = all.some((tag) => folded(tag.name) === wanted);
  const name = query.normalize('NFC').trim();
  return name === '' || exact ? options : [...options, { kind: 'create', name }];
}
