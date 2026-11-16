import { isProviderFailure } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { discordRuntime } from './runtime.ts';
import { CREDENTIALS, WEBHOOK, WEBHOOK_TOKEN } from './testing.ts';

const APP = { clientId: '1234567890', clientSecret: 's', publicBaseUrl: 'https://k.example.org' };
const message = (id: string) => `${WEBHOOK}/messages/${id}`;

async function analytics(exchanges: readonly ScriptedExchange[], remoteIds: readonly string[]) {
  if (discordRuntime.analytics === undefined) throw new Error('discord reads analytics');
  const http = scriptedHttp(exchanges);
  const result = await discordRuntime
    .analytics(testBaseContext(http), {
      app: APP,
      account: { providerAccountId: CREDENTIALS.channelId },
      credentials: CREDENTIALS,
      remoteIds,
      postTypes: {},
    })
    .catch((failure: unknown) => {
      if (!isProviderFailure(failure)) throw failure;
      return { thrown: failure.error, message: failure.message };
    });
  http.assertDone();
  return { result, calls: http.calls };
}

describe('discord analytics', () => {
  it('sums the reaction counts, 0 without reactions and NULL for a bad count', async () => {
    const { result, calls } = await analytics(
      [
        { url: message('1'), json: { id: '1', reactions: [{ count: 3 }, { count: 2 }] } },
        { url: message('2'), json: { id: '2' } },
        { url: message('3'), json: { id: '3', reactions: [{ count: 1 }, { count: -1 }] } },
      ],
      ['1', '2', '3'],
    );
    expect(result).toEqual({
      posts: { '1': { reactions: 5 }, '2': { reactions: 0 }, '3': { reactions: null } },
      apiVersion: 'v10',
    });
    expect(calls[0]?.headers.authorization).toBeUndefined();
  });

  it('ends a deleted or invalid message on its own, without the token', async () => {
    const gone = { url: message('1'), status: 404, json: { code: 10_008, message: 'Unknown' } };
    const { result } = await analytics([gone], ['1', '../x']);
    expect(result).toEqual({
      posts: {},
      failed: {
        '1': { kind: 'permanent', code: 'not_found' },
        '../x': { kind: 'permanent', code: 'remote_id_invalid' },
      },
      apiVersion: 'v10',
    });
  });

  it.each([
    [{ status: 429, json: { retry_after: 1 } }, 'rate_limited'],
    [{ status: 404, json: { code: 10_015 } }, 'auth_revoked'],
  ])('stops the channel on %o', async (reply, kind) => {
    const { result } = await analytics([{ url: message('1'), ...reply }], ['1', '2']);
    expect(result).toMatchObject({ thrown: { kind } });
    expect(JSON.stringify(result)).not.toContain(WEBHOOK_TOKEN);
  });
});
