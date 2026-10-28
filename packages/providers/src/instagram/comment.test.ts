import type { ChainLink, PublishItem } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { scriptedHttp, testPublishContext } from '../_kit/testing.ts';
import { instagramManifest } from './manifest.ts';
import { instagramRuntime } from './runtime.ts';
import { failureOf, form, GRAPH, input } from './testing.ts';

const MAIN_ID = '18000000000000009';
const COMMENT_ID = '17890000000000042';
const SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
];
const chain: readonly ChainLink[] = [{ position: 0, role: 'main', remoteId: MAIN_ID }];
const comment: PublishItem = { position: 1, role: 'comment', text: '#kronaut prvý', media: [] };

function commented(state = {}, scopes = SCOPES) {
  const base = input('carousel', [comment], state);
  return { ...base, chain, credentials: { ...base.credentials, scopes } };
}

describe('instagram first comment', () => {
  it('posts the message to the main media and records the comment id', async () => {
    const base = commented();
    const http = scriptedHttp([
      {
        method: 'POST',
        url: `${GRAPH}/${MAIN_ID}/comments?access_token=${base.credentials.accessToken}`,
        json: { id: COMMENT_ID },
      },
    ]);
    const run = testPublishContext(http);
    expect(await instagramRuntime.publish(run.ctx, base)).toEqual({
      kind: 'published',
      remoteId: COMMENT_ID,
    });
    http.assertDone();
    expect(form(http.calls[0])).toEqual({ message: '#kronaut prvý' });
    expect(run.checkpoints).toEqual([{ comment: COMMENT_ID }]);

    const again = scriptedHttp([]);
    const retried = testPublishContext(again).ctx;
    expect(await instagramRuntime.publish(retried, commented({ comment: COMMENT_ID }))).toEqual({
      kind: 'published',
      remoteId: COMMENT_ID,
    });
    expect(await instagramRuntime.verify?.(retried, commented())).toEqual({ kind: 'inconclusive' });
    expect(again.calls).toHaveLength(0);
    expect(
      await failureOf(instagramRuntime.publish(retried, commented({}, SCOPES.slice(0, 2)))),
    ).toEqual({ kind: 'permanent', code: 'comments_permission_missing' });
  });

  it('offers the comment only to accounts with the comments capability', () => {
    for (const type of instagramManifest.postTypes) {
      expect(type.comment?.steps).toEqual([{ id: 'create_comment', effect: 'public' }]);
      expect(instagramManifest.accountPostType?.(type, { comments: true })).toEqual(type);
      const { comment: _comment, ...plain } = type;
      for (const capabilities of [undefined, {}, { comments: false }])
        expect(instagramManifest.accountPostType?.(type, capabilities)).toEqual(plain);
    }
  });
});
