import type {
  ItemRole,
  MediaLimits,
  PostTypeSpec,
  ProviderManifest,
  TextCounting,
} from '@kronaut/core';
import { checkText, type TextRules } from './text.ts';
import { validateItemMedia } from './validate-media.ts';

export interface DraftMedia {
  readonly kind: 'image' | 'video';
  readonly mime: string;
  readonly bytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly altText?: string;
}

export interface DraftItem {
  readonly role: ItemRole;
  readonly text: string;
  readonly media: readonly DraftMedia[];
}

export type IssueCode =
  | 'unknown_post_type'
  | 'post_type_unavailable'
  | 'no_items'
  | 'invalid_item_roles'
  | 'text_too_long'
  | 'too_many_links'
  | 'too_few_media'
  | 'too_many_media'
  | 'media_not_allowed'
  | 'media_kind_unsupported'
  | 'mixed_media_unsupported'
  | 'mime_unsupported'
  | 'file_too_large'
  | 'media_metadata_missing'
  | 'image_too_narrow'
  | 'image_too_wide'
  | 'aspect_out_of_range'
  | 'duration_too_short'
  | 'duration_too_long'
  | 'frame_rate_too_high'
  | 'resolution_too_high'
  | 'alt_text_required'
  | 'alt_text_too_long';

export interface ValidationIssue {
  readonly code: IssueCode;
  readonly itemIndex?: number;
  readonly mediaIndex?: number;
  readonly counting?: TextCounting;
  readonly limit?: number;
  readonly actual?: number;
}

export function accountPostType(
  manifest: ProviderManifest,
  postTypeId: string,
  capabilities?: unknown,
): PostTypeSpec | undefined {
  const postType = manifest.postTypes.find((candidate) => candidate.id === postTypeId);
  if (postType === undefined || manifest.accountPostType === undefined) return postType;
  return manifest.accountPostType(postType, capabilities);
}

export const MAX_ITEMS = 25;

export function itemRolesValid(roles: readonly ItemRole[]): boolean {
  if (roles.length === 0 || roles[0] !== 'main') return false;
  const rest = roles.slice(1);
  const comment = rest.indexOf('comment');
  if (comment !== -1 && comment !== rest.length - 1) return false;
  return rest.every((role, index) => role === 'thread' || index === comment);
}

export function validate(
  manifest: ProviderManifest,
  postTypeId: string,
  items: readonly DraftItem[],
  capabilities?: unknown,
): ValidationIssue[] {
  const postType = accountPostType(manifest, postTypeId, capabilities);
  if (postType === undefined) {
    return [{ code: 'unknown_post_type' }];
  }
  if (postType.delivery === 'unsupported') {
    return [{ code: 'post_type_unavailable' }];
  }
  if (items.length === 0) {
    return [{ code: 'no_items' }];
  }
  if (!itemRolesValid(items.map((item) => item.role))) {
    return [{ code: 'invalid_item_roles' }];
  }
  const sent = sentItems(postType, items);
  const issues: ValidationIssue[] = [];
  for (const { item, itemIndex, rules } of sent) {
    for (const issue of checkText(rules.text, [item])) issues.push({ ...issue, itemIndex });
  }
  for (const { item, itemIndex, rules } of sent) {
    validateItemMedia(item, itemIndex, rules.media, issues);
  }
  return issues;
}

interface SentItem {
  readonly item: DraftItem;
  readonly itemIndex: number;
  readonly rules: { readonly text: TextRules; readonly media: MediaLimits };
}

function sentItems(postType: PostTypeSpec, items: readonly DraftItem[]): SentItem[] {
  const { thread, comment } = postType;
  let threads = 0;
  return items.flatMap((item, itemIndex) => {
    if (item.role === 'main')
      return [{ item, itemIndex, rules: { text: postType, media: postType.media } }];
    if (item.role === 'comment') {
      return comment === undefined
        ? []
        : [{ item, itemIndex, rules: { text: { text: comment.text }, media: postType.media } }];
    }
    threads += 1;
    return thread === undefined || threads > thread.maxItems
      ? []
      : [{ item, itemIndex, rules: { text: postType, media: thread.media } }];
  });
}
