import { describe, expect, it } from 'vitest';
import type { Channel, Destination } from '../api.ts';
import { type Contents, EMPTY_CONTENTS } from './contents.ts';
import { toPlan } from './plan.ts';
import type { ContentsState } from './use-contents.ts';

const CHANNEL = { id: 'acct_ig', provider: 'instagram', status: 'active' } as unknown as Channel;
const STORED = {
  accountId: 'acct_ig',
  publishType: 'image',
  settings: { shareToFeed: true },
  deliveryMode: 'reminder',
} as unknown as Destination;

function destination(images: number) {
  const facts = Array.from({ length: images }, () => ({ size: 1, type: 'image/jpeg' }));
  const state = {
    contents: EMPTY_CONTENTS satisfies Contents,
    skipped: new Set<string>(),
    mediaFor: () => ({ images: facts, video: false }),
  } as unknown as ContentsState;
  return toPlan([CHANNEL], state, new Set([CHANNEL.id]), [STORED]).destinations[0];
}

describe('toPlan', () => {
  it('keeps settings and delivery mode on the same publish type', () => {
    expect(destination(1)).toEqual({
      accountId: 'acct_ig',
      publishType: 'image',
      variant: null,
      settings: { shareToFeed: true },
      deliveryMode: 'reminder',
    });
  });

  it('drops settings but keeps a reminder when the media changes the type', () => {
    expect(destination(2)).toEqual({
      accountId: 'acct_ig',
      publishType: 'carousel',
      variant: null,
      deliveryMode: 'reminder',
    });
  });
});
