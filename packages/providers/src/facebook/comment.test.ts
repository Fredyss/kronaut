import { createHmac } from 'node:crypto';
import type { PublishInput, PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { scriptedHttp, testPublishContext } from '../_kit/testing.ts';
import { type FacebookSettings, facebookManifest } from './manifest.ts';
import { type FacebookCredentials, facebookRuntime } from './runtime.ts';

const PAGE_ID = '1012345678901234';
const TOKEN = 'page-token-canary-5d3e';
const SECRET = 'facebook-secret-canary-7c1a';
const PROOF = createHmac('sha256', SECRET).update(TOKEN).digest('hex');
const COMMENT_ID = '5550001112223334_7770001112223334';
const comment: PublishItem = { position: 1, role: 'comment', text: 'První komentář', media: [] };

function commented(
  postType: string,
  mainId: string,
): PublishInput<FacebookCredentials, FacebookSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType,
    account: { providerAccountId: PAGE_ID },
    credentials: { accessToken: TOKEN },
    app: {
      clientId: '1234567890123456',
      clientSecret: SECRET,
      publicBaseUrl: 'https://k.example.org',
    },
    settings: {},
    items: [comment],
    chain: [{ position: 0, role: 'main', remoteId: mainId }],
    state: {},
  };
}

describe('facebook first comment', () => {
  it('comments on a feed post or a reel with the Page token and records the comment id', async () => {
    for (const [postType, mainId] of [
      ['post', `${PAGE_ID}_5550001112223334`],
      ['reel', '9990001112223334'],
    ] as const) {
      const http = scriptedHttp([
        {
          method: 'POST',
          url: `https://graph.facebook.com/v26.0/${mainId}/comments`,
          json: { id: COMMENT_ID },
        },
      ]);
      const run = testPublishContext(http);
      expect(await facebookRuntime.publish(run.ctx, commented(postType, mainId))).toEqual({
        kind: 'published',
        remoteId: COMMENT_ID,
      });
      http.assertDone();
      expect(Object.fromEntries(new URLSearchParams(String(http.calls[0]?.body)))).toEqual({
        message: 'První komentář',
        access_token: TOKEN,
        appsecret_proof: PROOF,
      });
      expect(run.checkpoints).toEqual([{ comment: COMMENT_ID }]);
      expect(await facebookRuntime.verify?.(run.ctx, commented(postType, mainId))).toEqual({
        kind: 'inconclusive',
      });
    }
  });

  it('offers the comment only to Pages with the comments capability', () => {
    for (const type of facebookManifest.postTypes) {
      expect(type.comment?.steps).toEqual([{ id: 'create_comment', effect: 'public' }]);
      expect(facebookManifest.accountPostType?.(type, { comments: true })).toEqual(type);
      const { comment: _comment, ...plain } = type;
      for (const capabilities of [undefined, {}, { comments: false }])
        expect(facebookManifest.accountPostType?.(type, capabilities)).toEqual(plain);
    }
  });
});
