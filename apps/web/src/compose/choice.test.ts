import { describe, expect, it } from 'vitest';
import type { Channel } from '../api.ts';
import { choiceFor, type ImageFacts, type MediaFacts } from './choice.ts';

const threads: Channel = {
  id: 'acct_threads',
  provider: 'threads',
  accountKind: 'personal',
  handle: '@ada',
  displayName: 'Ada on Threads',
  profileUrl: null,
  status: 'active',
  statusReason: null,
  accessExpiresAt: null,
  connectedAt: '2026-10-01T08:00:00.000Z',
  lastErrorCode: null,
  postTypes: [],
  preview: 'short-feed',
};

const facebook: Channel = {
  ...threads,
  id: 'acct_facebook',
  provider: 'facebook',
  accountKind: 'page',
  handle: null,
  displayName: 'Ada Bakery',
  preview: 'pro-feed',
};

const images = (
  count: number,
  facts: ImageFacts = { size: 1_000, type: 'image/png' },
): MediaFacts => ({ images: Array.from({ length: count }, () => facts), video: false });

const VIDEO: MediaFacts = { images: [], video: true };

describe('threads publish choice', () => {
  it('takes a text-only post and up to 20 JPEG or PNG images as one post type', () => {
    expect(choiceFor(threads, images(0))).toEqual({ kind: 'ok', publishType: 'post' });
    expect(choiceFor(threads, images(1, { size: 8_000_000, type: 'image/jpeg' }))).toEqual({
      kind: 'ok',
      publishType: 'post',
    });
    expect(choiceFor(threads, images(20))).toEqual({ kind: 'ok', publishType: 'post' });
  });

  it('refuses a 21st image, other types and files over 8 MB', () => {
    expect(choiceFor(threads, images(21))).toEqual({ kind: 'too_many_images', max: 20 });
    expect(choiceFor(threads, images(1, { size: 1_000, type: 'image/webp' }))).toEqual({
      kind: 'image_type_unsupported',
    });
    expect(choiceFor(threads, images(1, { size: 8_000_001, type: 'image/png' }))).toEqual({
      kind: 'image_too_large',
      maxBytes: 8_000_000,
    });
  });
});

describe('facebook publish choice', () => {
  it('takes a text-only post and up to 10 images as one post type', () => {
    expect(choiceFor(facebook, images(0))).toEqual({ kind: 'ok', publishType: 'post' });
    expect(choiceFor(facebook, images(10))).toEqual({ kind: 'ok', publishType: 'post' });
    expect(choiceFor(facebook, images(11))).toEqual({ kind: 'too_many_images', max: 10 });
  });
});

describe('linkedin publish choice', () => {
  const linkedin: Channel = {
    ...threads,
    id: 'acct_linkedin',
    provider: 'linkedin',
    accountKind: 'person',
    handle: null,
    displayName: 'Ada Novák',
  };

  it('takes a text-only post and up to 20 images as one post type', () => {
    expect(choiceFor(linkedin, images(0))).toEqual({ kind: 'ok', publishType: 'post' });
    expect(choiceFor(linkedin, images(20))).toEqual({ kind: 'ok', publishType: 'post' });
    expect(choiceFor(linkedin, images(21))).toEqual({ kind: 'too_many_images', max: 20 });
  });
});

describe('video publish choice', () => {
  const instagram: Channel = { ...threads, id: 'acct_ig', provider: 'instagram' };

  it('publishes a video to Instagram as a Reel', () => {
    expect(choiceFor(instagram, VIDEO)).toEqual({ kind: 'ok', publishType: 'reel' });
    expect(choiceFor(instagram, images(0))).toEqual({ kind: 'needs_image' });
  });

  it('marks video as unsupported on the other networks', () => {
    expect(choiceFor(threads, VIDEO)).toEqual({ kind: 'video_unsupported' });
    expect(choiceFor(facebook, VIDEO)).toEqual({ kind: 'video_unsupported' });
  });
});
