import type { VideoCheckReport } from '@kronaut/providers/bluesky/video-check';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { type BlueskyChannel, checkBlueskyChannels } from './bluesky-video.ts';

const NOW = Temporal.Instant.from('2026-11-10T12:00:00Z');
const at = (seconds: number) => new Date(NOW.add({ seconds }).epochMilliseconds);

function channel(handle: string | null, overrides: Partial<BlueskyChannel> = {}): BlueskyChannel {
  return {
    id: `acct_${handle ?? 'none'}`,
    handle,
    did: 'did:plc:abcdefghijklmnopqrstuvwx',
    credentials: { marker: handle },
    accessExpiresAt: at(600),
    ...overrides,
  };
}

const ready: VideoCheckReport = {
  checks: [{ id: 'upload_token', result: { outcome: 'ok' } }],
};

describe('checking Bluesky channels', () => {
  it('checks only channels with a credential and an access token that is still valid', async () => {
    const seen: unknown[] = [];
    const checked = await checkBlueskyChannels(
      [
        channel('valid.example.com'),
        channel('gone.example.com', { credentials: null }),
        channel('stale.example.com', { accessExpiresAt: at(30) }),
        channel(null, { accessExpiresAt: null }),
      ],
      async (credentials) => {
        seen.push(credentials);
        return ready;
      },
      () => NOW,
    );
    expect(seen).toEqual([{ marker: 'valid.example.com' }, { marker: null }]);
    expect(checked.map(({ name, check }) => [name, check.kind])).toEqual([
      ['valid.example.com', 'checked'],
      ['gone.example.com', 'no_credential'],
      ['stale.example.com', 'expired'],
      ['did:plc:abcdefghijklmnopqrstuvwx', 'checked'],
    ]);
  });
});
