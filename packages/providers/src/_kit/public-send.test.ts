import { ProviderFailure, type ProviderManifest } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { afterSend, beginPublicSend } from './public-send.ts';
import { assertPublicSendOrder, scriptedHttp, TEST_NOW, testPublishContext } from './testing.ts';

const manifest = {
  postTypes: [
    {
      steps: [
        { id: 'upload', effect: 'private' },
        { id: 'send', effect: 'public' },
      ],
    },
  ],
} as unknown as ProviderManifest;

describe('beginPublicSend', () => {
  it('declares the step, then saves the stamped state', async () => {
    const { ctx, checkpoints, events } = testPublishContext(scriptedHttp([]));
    const sent = await beginPublicSend(ctx, 'create_post', { media: ['a'] });
    expect(sent).toEqual({
      media: ['a'],
      sentAt: TEST_NOW.toString({ smallestUnit: 'millisecond' }),
    });
    expect(checkpoints).toEqual([sent]);
    expect(events).toEqual(['step:create_post', 'checkpoint']);
  });

  it('saves nothing when the step is refused', async () => {
    const { ctx, checkpoints } = testPublishContext(scriptedHttp([]));
    const refused = new Error('refused');
    const fenced = { ...ctx, step: () => Promise.reject(refused) };
    await expect(beginPublicSend(fenced, 'create_post', {})).rejects.toBe(refused);
    expect(checkpoints).toEqual([]);
  });
});

describe('assertPublicSendOrder', () => {
  it('accepts step, checkpoint, then the send', () => {
    const events = ['step:upload', 'step:send', 'checkpoint', 'request:POST https://x'];
    expect(() => assertPublicSendOrder(events, manifest)).not.toThrow();
  });

  it('refuses a send before the checkpoint', () => {
    const events = ['step:send', 'request:POST https://x', 'checkpoint'];
    expect(() => assertPublicSendOrder(events, manifest)).toThrow(/must checkpoint/);
  });

  it('refuses a step the manifest does not declare', () => {
    const events = ['step:snd', 'checkpoint', 'request:POST https://x'];
    expect(() => assertPublicSendOrder(events, manifest)).toThrow(/undeclared steps: step:snd/);
  });

  it('refuses a run with no public step', () => {
    expect(() => assertPublicSendOrder(['step:upload'], manifest)).toThrow(/no public step/);
  });
});

describe('afterSend', () => {
  it('returns what the read returns', async () => {
    await expect(afterSend(async () => 'link')).resolves.toBe('link');
  });

  it('swallows a provider failure', async () => {
    const read = () => Promise.reject(new ProviderFailure({ kind: 'transient' }));
    await expect(afterSend(read)).resolves.toBeUndefined();
  });

  it('rethrows anything else', async () => {
    const bug = new TypeError('bug');
    await expect(afterSend(() => Promise.reject(bug))).rejects.toBe(bug);
  });
});
