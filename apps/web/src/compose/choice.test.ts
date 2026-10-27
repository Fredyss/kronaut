import { describe, expect, it } from 'vitest';
import type { Channel } from '../api.ts';
import { choiceFor, type ImageFacts } from './choice.ts';

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

const images = (count: number, facts: ImageFacts = { size: 1_000, type: 'image/png' }) =>
  Array.from({ length: count }, () => facts);

describe('threads publish choice', () => {
  it('takes a text-only post and up to 20 JPEG or PNG images as one post type', () => {
    expect(choiceFor(threads, [])).toEqual({ kind: 'ok', publishType: 'post' });
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
    expect(choiceFor(facebook, [])).toEqual({ kind: 'ok', publishType: 'post' });
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
    expect(choiceFor(linkedin, [])).toEqual({ kind: 'ok', publishType: 'post' });
    expect(choiceFor(linkedin, images(20))).toEqual({ kind: 'ok', publishType: 'post' });
    expect(choiceFor(linkedin, images(21))).toEqual({ kind: 'too_many_images', max: 20 });
  });
});
