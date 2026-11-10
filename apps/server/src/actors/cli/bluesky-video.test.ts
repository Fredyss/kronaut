import type { VideoCheckReport } from '@kronaut/providers/bluesky/video-check';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import {
  type BlueskyChannel,
  type ChannelCredential,
  checkBlueskyChannels,
} from './bluesky-video.ts';

const NOW = Temporal.Instant.from('2026-11-10T12:00:00Z');
const DID = 'did:plc:abcdefghijklmnopqrstuvwx';
const at = (seconds: number) => new Date(NOW.add({ seconds }).epochMilliseconds);

function stored(marker: string, accessExpiresAt: Date | null = at(600)): ChannelCredential {
  return { kind: 'stored', value: { marker }, accessExpiresAt };
}

function channel(handle: string | null, credential: ChannelCredential): BlueskyChannel {
  return { id: `acct_${handle ?? 'none'}`, handle, did: DID, credential };
}

const ready: VideoCheckReport = {
  checks: [{ id: 'upload_token', result: { outcome: 'ok' } }],
};

describe('checking Bluesky channels', () => {
  it('checks only channels with a readable credential and an access token that is still valid', async () => {
    const seen: unknown[] = [];
    const checked = await checkBlueskyChannels(
      [
        channel('valid.example.com', stored('valid')),
        channel('gone.example.com', { kind: 'missing' }),
        channel('sealed.example.com', { kind: 'unreadable' }),
        channel('stale.example.com', stored('stale', at(30))),
        channel(null, stored('no-expiry', null)),
      ],
      async (credentials) => {
        seen.push(credentials);
        return ready;
      },
      () => NOW,
    );
    expect(seen).toEqual([{ marker: 'valid' }, { marker: 'no-expiry' }]);
    expect(checked.map(({ name, check }) => [name, check.kind])).toEqual([
      ['valid.example.com', 'checked'],
      ['gone.example.com', 'no_credential'],
      ['sealed.example.com', 'unreadable'],
      ['stale.example.com', 'expired'],
      [DID, 'checked'],
    ]);
  });

  it('keeps going when one channel cannot be checked', async () => {
    const checked = await checkBlueskyChannels(
      [channel('bad.example.com', stored('bad')), channel('good.example.com', stored('good'))],
      async (credentials) => {
        if ((credentials as { marker: string }).marker === 'bad') throw new TypeError('bad key');
        return ready;
      },
      () => NOW,
    );
    expect(checked.map(({ check }) => check.kind)).toEqual(['unreadable', 'checked']);
  });

  it('names a channel by its DID when the stored handle is not a plain handle', async () => {
    const checked = await checkBlueskyChannels(
      [channel('evil.example.com\u001b[2J', stored('x'))],
      async () => ready,
      () => NOW,
    );
    expect(checked[0]?.name).toBe(DID);
  });
});
