import { describe, expect, it } from 'vitest';
import { classifyEntry, entryOrder } from './archive.ts';

const KEY = `${'ab'.repeat(32)}.jpg`;
const OTHER = `${'cd'.repeat(32)}.png`;

describe('archive whitelist', () => {
  it('accepts only the dump, media keys and the manifest as regular files', () => {
    expect(classifyEntry({ name: 'manifest.json', type: 'file' })).toEqual({ kind: 'manifest' });
    expect(classifyEntry({ name: 'db.dump', type: 'file' })).toEqual({ kind: 'dump' });
    expect(classifyEntry({ name: `media/${KEY}`, type: 'file' })).toEqual({
      kind: 'media',
      key: KEY,
    });
    const rejected = [
      { name: `media/${KEY}`, type: 'symlink' },
      { name: `media/${KEY}`, type: 'link' },
      { name: 'media/', type: 'directory' },
      { name: 'media/../../x', type: 'file' },
      { name: '../x', type: 'file' },
      { name: '/etc/passwd', type: 'file' },
      { name: `/media/${KEY}`, type: 'file' },
      { name: `./media/${KEY}`, type: 'file' },
      { name: `media/${KEY}/x`, type: 'file' },
      { name: `media/${KEY.toUpperCase()}`, type: 'file' },
      { name: 'manifest.json/', type: 'file' },
      { name: 'extra.txt', type: 'file' },
      { name: 'db.dump', type: 'pax-header' },
    ];
    for (const header of rejected) expect(() => classifyEntry(header)).toThrow();
  });

  it('requires db.dump first, distinct media, then manifest.json last', () => {
    expect(() => entryOrder().next({ kind: 'manifest' })).toThrow('db.dump must be the first');
    expect(() => entryOrder().next({ kind: 'media', key: KEY })).toThrow('first');

    const order = entryOrder();
    order.next({ kind: 'dump' });
    expect(() => order.finish()).toThrow('missing');
    order.next({ kind: 'media', key: KEY });
    expect(() => order.next({ kind: 'media', key: KEY })).toThrow('repeats');
    expect(() => order.next({ kind: 'dump' })).toThrow('repeats');
    order.next({ kind: 'media', key: OTHER });
    order.next({ kind: 'manifest' });
    expect(() => order.next({ kind: 'media', key: `${'ef'.repeat(32)}` })).toThrow('last');
    expect(() => order.next({ kind: 'manifest' })).toThrow('last');
    order.finish();

    const empty = entryOrder();
    empty.next({ kind: 'dump' });
    empty.next({ kind: 'manifest' });
    empty.finish();
  });
});
