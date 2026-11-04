import type { MediaLimits, ProviderManifest } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { createProviderRegistry } from '../../base/providers/providers.ts';
import { fakeManifest, fakeProvider } from '../../steps/publish/testing/fake.ts';
import { canTakeItems, publishTypeFor } from './pick.ts';

const [post] = fakeManifest.postTypes;
const { runtime } = fakeProvider();

function registry(...media: Partial<MediaLimits>[]) {
  if (post === undefined) throw new Error('the fake has a post type');
  const postTypes = media.map((limits, n) => ({
    ...post,
    id: `type${n}`,
    media: { ...post.media, ...limits },
  }));
  const manifest: ProviderManifest = { ...fakeManifest, postTypes };
  return createProviderRegistry([manifest], [runtime]);
}

const channel = { id: 'c', provider: fakeManifest.id, capabilities: null };
const jpeg = { kind: 'image', mime: 'image/jpeg', bytes: 10 } as const;

describe('the publish type of a feed item', () => {
  it('takes the first type that fits text alone or the one image', () => {
    const providers = registry({ minCount: 1, maxCount: 1 }, { minCount: 0 });
    expect(publishTypeFor(providers, channel, [])).toBe('type1');
    expect(publishTypeFor(providers, channel, [jpeg])).toBe('type0');
    expect(publishTypeFor(providers, channel, [{ ...jpeg, mime: 'image/gif' }])).toBeNull();
  });

  it('accepts a channel for a feed when it can post text alone or one image', () => {
    expect(canTakeItems(registry({ minCount: 1, maxCount: 1 }), channel)).toBe(true);
    expect(canTakeItems(registry({ minCount: 2, maxCount: 4 }), channel)).toBe(false);
    expect(canTakeItems(registry(), { ...channel, provider: 'retired' })).toBe(false);
  });
});
