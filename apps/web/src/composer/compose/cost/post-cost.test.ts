import { describe, expect, it } from 'vitest';
import type { Channel } from '../../../records/channels/queries.ts';
import type { Doc } from '../../../records/posts/doc.ts';
import { type CostTarget, postCosts } from './post-cost.tsx';

const RATES = {
  usdMicros: 15_000,
  linkUsdMicros: 200_000,
  asOf: '2026-11-23',
  sourceUrl: 'https://docs.x.com/x-api/getting-started/pricing',
};

const x: Channel = {
  id: 'acct_x',
  provider: 'x_com',
  accountKind: 'account',
  handle: 'ada',
  displayName: 'Ada on X',
  profileUrl: null,
  status: 'active',
  statusReason: null,
  accessExpiresAt: null,
  connectedAt: '2026-10-01T08:00:00.000Z',
  lastErrorCode: null,
  postTypes: [
    {
      id: 'post',
      text: [{ counting: 'x-weighted', max: 280 }],
      maxLinks: null,
      imageAspect: null,
      video: null,
      thread: { maxItems: 24 },
      comment: null,
    },
  ],
  requiredSettings: [],
  settingOptions: {},
  signature: null,
  shortenLinks: true,
  dataRetentionDays: 7,
  brandId: null,
  groupIds: [],
  preview: 'short-feed',
  manualOnly: false,
  insights: false,
  cost: RATES,
};

function doc(text: string): Doc {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  } as Doc;
}

function target(channel: Channel, text: string, replies: readonly string[] = []): CostTarget {
  return {
    channel,
    doc: doc(text),
    shown: true,
    items: replies.map((reply, index) => ({
      item: { kind: 'thread', position: index + 1 },
      doc: doc(reply),
    })),
  };
}

describe('post cost', () => {
  it('prices each chain item, higher when it carries a link', () => {
    const [cost] = postCosts([target(x, 'Hello', ['Read example.com', 'Bye'])]);
    expect(cost).toMatchObject({ channel: 'Ada on X', posts: 3, usdMicros: 230_000 });
  });

  it('shows nothing for a free provider or a hidden destination', () => {
    expect(postCosts([target({ ...x, cost: null }, 'Hello')])).toEqual([]);
    expect(postCosts([{ ...target(x, 'Hello'), shown: false }])).toEqual([]);
  });
});
