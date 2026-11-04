import { accountPostType, type DraftMedia, validate } from '@kronaut/compose';
import type { PostTypeSpec } from '@kronaut/core';
import type { ProviderRegistry } from '../../base/providers/providers.ts';

export interface FeedChannel {
  readonly id: string;
  readonly provider: string;
  readonly capabilities: unknown;
}

function takesTextOrOneImage(type: PostTypeSpec | undefined): boolean {
  if (type === undefined || type.delivery === 'unsupported') return false;
  const { media } = type;
  return (
    media.minCount === 0 ||
    (media.image !== undefined && media.minCount <= 1 && media.maxCount >= 1)
  );
}

export function canTakeItems(providers: ProviderRegistry, channel: FeedChannel): boolean {
  const manifest = providers.get(channel.provider)?.manifest;
  if (manifest === undefined) return false;
  return manifest.postTypes.some(({ id }) =>
    takesTextOrOneImage(accountPostType(manifest, id, channel.capabilities)),
  );
}

// Only the media decides, so a text that is too long still fails the item in preflight.
export function publishTypeFor(
  providers: ProviderRegistry,
  channel: FeedChannel,
  media: readonly DraftMedia[],
): string | null {
  const manifest = providers.get(channel.provider)?.manifest;
  if (manifest === undefined) return null;
  const items = [{ role: 'main' as const, text: '', media }];
  const type = manifest.postTypes.find(
    ({ id }) => validate(manifest, id, items, channel.capabilities).length === 0,
  );
  return type?.id ?? null;
}
