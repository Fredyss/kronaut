import { describe, expect, it } from 'vitest';
import { DocError } from './canonical.ts';
import {
  CONTENT_HASH_V,
  type ContentHashInput,
  contentHash,
  contentHashPayload,
  type HashItem,
  type HashMedia,
  toHex,
} from './content-hash.ts';

const ACCOUNT = '0197a5c2-3b4d-7e8f-9a0b-1c2d3e4f5a6b';
const SHA_A = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const SHA_B = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

const text = (value: string) => ({ type: 'text', text: value });
const para = (...content: unknown[]) =>
  content.length === 0 ? { type: 'paragraph' } : { type: 'paragraph', content };
const doc = (...content: unknown[]) => ({ type: 'doc', content });

function media(overrides: Partial<HashMedia> = {}): HashMedia {
  return { sha256: SHA_A, transform: null, alt: null, ai: false, ...overrides };
}

function item(overrides: Partial<HashItem> = {}): HashItem {
  return {
    role: 'main',
    doc: doc(para(text('Hello'))),
    docSchemaV: 1,
    media: [],
    ...overrides,
  };
}

function input(overrides: Partial<ContentHashInput> = {}): ContentHashInput {
  return {
    provider: 'bluesky',
    account: ACCOUNT,
    publishType: 'post',
    deliveryMode: 'auto',
    language: 'en',
    items: [
      item({ media: [media({ alt: 'one' }), media({ sha256: SHA_B, alt: 'two' })] }),
      item({ role: 'thread', doc: doc(para(text('Second'))) }),
    ],
    settings: { threadgate: 'everyone', langs: ['en'] },
    ...overrides,
  };
}

async function hexOf(value: ContentHashInput): Promise<string> {
  return toHex(await contentHash(value));
}

describe('contentHashPayload', () => {
  it('returns the JCS string of the documented shape', () => {
    const payload = contentHashPayload({
      provider: 'bluesky',
      account: ACCOUNT,
      publishType: 'post',
      deliveryMode: 'reminder',
      language: null,
      items: [
        {
          role: 'main',
          doc: doc(para(text('Hi'))),
          docSchemaV: 1,
          media: [{ sha256: SHA_A, transform: { w: 1000, x: 0 }, alt: null, ai: true }],
        },
      ],
      settings: { b: 1, a: [true, null] },
    });
    expect(payload).toBe(
      `{"account":"${ACCOUNT}","delivery_mode":"reminder","items":[{"doc":{"content":[{"content":[{"text":"Hi","type":"text"}],"type":"paragraph"}],"type":"doc"},"media":[{"ai":true,"alt":null,"sha256":"${SHA_A}","transform":{"w":1000,"x":0}}],"role":"main"}],"language":null,"provider":"bluesky","publish_type":"post","settings":{"a":[true,null],"b":1},"v":1}`,
    );
    expect(CONTENT_HASH_V).toBe(1);
  });

  it('keeps items and media in the given order', () => {
    const forward = contentHashPayload(input());
    const reversedItems = contentHashPayload(input({ items: [...input().items].reverse() }));
    expect(forward.indexOf('"Second"')).toBeGreaterThan(forward.indexOf('"Hello"'));
    expect(reversedItems.indexOf('"Second"')).toBeLessThan(reversedItems.indexOf('"Hello"'));
    expect(forward.indexOf(SHA_A)).toBeLessThan(forward.indexOf(SHA_B));
  });

  it('canonicalises the document before hashing', () => {
    const payload = contentHashPayload(
      input({
        items: [item({ doc: { type: 'doc', extra: 1, content: [para(text('č\r\nx'))] } })],
      }),
    );
    expect(payload).toContain('"text":"č\\nx"');
    expect(payload).not.toContain('extra');
  });

  it('normalises alt text to NFC but leaves other alt text alone', () => {
    const payload = contentHashPayload(
      input({ items: [item({ media: [media({ alt: ' č\r\n ' })] })] }),
    );
    expect(payload).toContain('"alt":" č\\r\\n "');
  });

  it('accepts a 40 character provider and rejects 41', () => {
    expect(() => contentHashPayload(input({ provider: 'a'.repeat(40) }))).not.toThrow();
    expect(() => contentHashPayload(input({ provider: 'a'.repeat(41) }))).toThrow(TypeError);
  });

  it.each(['', 'Bluesky', 'blue-sky', 'blue sky', 'bluesky\n', 'blüesky'])(
    'rejects provider %j',
    (provider) => {
      expect(() => contentHashPayload(input({ provider }))).toThrow(TypeError);
    },
  );

  it.each([
    '',
    'not-a-uuid',
    ACCOUNT.toUpperCase(),
    ACCOUNT.replaceAll('-', ''),
    `${ACCOUNT}0`,
    ` ${ACCOUNT}`,
    `${ACCOUNT}\n`,
    '0197a5c2-3b4d-7e8f-9a0b-1c2d3e4f5a6g',
  ])('rejects account %j', (account) => {
    expect(() => contentHashPayload(input({ account }))).toThrow(TypeError);
  });

  it.each([
    '',
    SHA_A.toUpperCase(),
    SHA_A.slice(1),
    `${SHA_A}0`,
    `${SHA_A.slice(1)}g`,
    `${SHA_A}\n`,
  ])('rejects media sha256 %j', (sha256) => {
    expect(() =>
      contentHashPayload(input({ items: [item({ media: [media({ sha256 })] })] })),
    ).toThrow(TypeError);
  });

  it('rejects an unknown item role', () => {
    const bad = item({ role: 'reply' as HashItem['role'] });
    expect(() => contentHashPayload(input({ items: [bad] }))).toThrow(TypeError);
  });

  it('accepts every valid item role', () => {
    for (const role of ['main', 'thread', 'comment'] as const) {
      expect(() => contentHashPayload(input({ items: [item({ role })] }))).not.toThrow();
    }
  });

  it('rejects missing settings so the key cannot silently disappear', () => {
    expect(() => contentHashPayload(input({ settings: undefined }))).toThrow(TypeError);
    expect(() => contentHashPayload(input({ settings: null }))).not.toThrow();
  });

  it('rejects floats in settings and transform', () => {
    expect(() => contentHashPayload(input({ settings: { ratio: 1.5 } }))).toThrow(TypeError);
    expect(() => contentHashPayload(input({ settings: { nested: [{ x: 0.1 }] } }))).toThrow(
      TypeError,
    );
    expect(() =>
      contentHashPayload(input({ items: [item({ media: [media({ transform: { x: 0.125 } })] })] })),
    ).toThrow(TypeError);
    expect(() => contentHashPayload(input({ settings: { n: Number.NaN } }))).toThrow(TypeError);
  });

  it('surfaces document errors as DocError', () => {
    const invalid = item({ doc: { type: 'doc', content: [] } });
    expect(() => contentHashPayload(input({ items: [invalid] }))).toThrow(DocError);
    const unknownVersion = item({ docSchemaV: 2 });
    expect(() => contentHashPayload(input({ items: [unknownVersion] }))).toThrow(DocError);
  });
});

describe('contentHash', () => {
  it('returns 32 bytes', async () => {
    const hash = await contentHash(input());
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('matches SHA-256 of the UTF-8 payload', async () => {
    const value = input();
    const expected = await globalThis.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(contentHashPayload(value)),
    );
    expect(toHex(await contentHash(value))).toBe(toHex(new Uint8Array(expected)));
  });

  it('is stable across calls', async () => {
    expect(await hexOf(input())).toBe(await hexOf(input()));
  });

  it('ignores NFD versus NFC in document text', async () => {
    const nfc = input({ items: [item({ doc: doc(para(text('Žluťoučký kůň'))) })] });
    const nfd = input({
      items: [item({ doc: doc(para(text('Žluťoučký kůň'.normalize('NFD')))) })],
    });
    expect(await hexOf(nfd)).toBe(await hexOf(nfc));
  });

  it('ignores CRLF versus LF in document text', async () => {
    const lf = input({ items: [item({ doc: doc(para(text('a\nb'))) })] });
    const crlf = input({ items: [item({ doc: doc(para(text('a\r\nb'))) })] });
    expect(await hexOf(crlf)).toBe(await hexOf(lf));
  });

  it('ignores how adjacent text nodes are split', async () => {
    const joined = input({ items: [item({ doc: doc(para(text('č'))) })] });
    const split = input({ items: [item({ doc: doc(para(text('c'), text('̌'))) })] });
    expect(await hexOf(split)).toBe(await hexOf(joined));
  });

  it('ignores unknown keys and attrs inside documents', async () => {
    const clean = input({ items: [item({ doc: doc(para(text('a'))) })] });
    const noisy = input({
      items: [
        item({
          doc: {
            type: 'doc',
            meta: 1,
            content: [{ type: 'paragraph', attrs: { x: 1 }, content: [text('a')] }],
          },
        }),
      ],
    });
    expect(await hexOf(noisy)).toBe(await hexOf(clean));
  });

  it('ignores property order in documents, settings and transforms', async () => {
    const a = input({
      items: [
        item({
          doc: {
            content: [{ content: [{ text: 'x', type: 'text' }], type: 'paragraph' }],
            type: 'doc',
          },
          media: [media({ transform: { x: 1, y: 2, w: 3, h: 4 } })],
        }),
      ],
      settings: { a: 1, b: { c: 2, d: 3 } },
    });
    const b = input({
      items: [
        item({
          doc: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }],
          },
          media: [media({ transform: { h: 4, w: 3, y: 2, x: 1 } })],
        }),
      ],
      settings: { b: { d: 3, c: 2 }, a: 1 },
    });
    expect(await hexOf(a)).toBe(await hexOf(b));
  });

  it('ignores NFD versus NFC in alt text', async () => {
    const nfc = input({ items: [item({ media: [media({ alt: 'Kôň na lúke' })] })] });
    const nfd = input({
      items: [item({ media: [media({ alt: 'Kôň na lúke'.normalize('NFD') })] })],
    });
    expect(await hexOf(nfd)).toBe(await hexOf(nfc));
  });

  it('changes when any single field changes', async () => {
    const base = input();
    const [first, second] = base.items as [HashItem, HashItem];
    const [m1, m2] = first.media as [HashMedia, HashMedia];
    const variants: [string, ContentHashInput][] = [
      ['provider', { ...base, provider: 'mastodon' }],
      ['account', { ...base, account: '0197a5c2-3b4d-7e8f-9a0b-1c2d3e4f5a6c' }],
      ['publish type', { ...base, publishType: 'reply' }],
      ['delivery mode', { ...base, deliveryMode: 'reminder' }],
      ['language', { ...base, language: 'sk' }],
      ['language null', { ...base, language: null }],
      ['settings value', { ...base, settings: { threadgate: 'nobody', langs: ['en'] } }],
      [
        'settings extra key',
        { ...base, settings: { threadgate: 'everyone', langs: ['en'], x: 0 } },
      ],
      ['item order', { ...base, items: [second, first] }],
      ['item dropped', { ...base, items: [first] }],
      ['item role', { ...base, items: [{ ...first, role: 'thread' }, second] }],
      ['doc text', { ...base, items: [{ ...first, doc: doc(para(text('Hello!'))) }, second] }],
      [
        'doc break',
        { ...base, items: [{ ...first, doc: doc(para(text('Hello')), para()) }, second] },
      ],
      ['media order', { ...base, items: [{ ...first, media: [m2, m1] }, second] }],
      ['media dropped', { ...base, items: [{ ...first, media: [m1] }, second] }],
      [
        'media sha256',
        {
          ...base,
          items: [{ ...first, media: [media({ sha256: SHA_B, alt: 'one' }), m2] }, second],
        },
      ],
      [
        'media ai flag',
        { ...base, items: [{ ...first, media: [{ ...m1, ai: true }, m2] }, second] },
      ],
      ['media alt', { ...base, items: [{ ...first, media: [{ ...m1, alt: 'uno' }, m2] }, second] }],
      [
        'media alt null',
        { ...base, items: [{ ...first, media: [{ ...m1, alt: null }, m2] }, second] },
      ],
      [
        'media alt empty',
        { ...base, items: [{ ...first, media: [{ ...m1, alt: '' }, m2] }, second] },
      ],
      [
        'media transform',
        { ...base, items: [{ ...first, media: [{ ...m1, transform: { x: 1 } }, m2] }, second] },
      ],
    ];
    const baseline = await hexOf(base);
    const seen = new Set<string>([baseline]);
    for (const [label, variant] of variants) {
      const hex = await hexOf(variant);
      expect(hex, label).not.toBe(baseline);
      seen.add(hex);
    }
    expect(seen.size).toBe(variants.length + 1);
  });

  it('rejects with TypeError for floats instead of hashing them', async () => {
    await expect(contentHash(input({ settings: { ratio: 1.5 } }))).rejects.toThrow(TypeError);
    await expect(
      contentHash(input({ items: [item({ media: [media({ transform: { x: 0.5 } })] })] })),
    ).rejects.toThrow(TypeError);
  });

  it('matches the golden payload and hash', async () => {
    const golden: ContentHashInput = {
      provider: 'bluesky',
      account: ACCOUNT,
      publishType: 'post',
      deliveryMode: 'auto',
      language: 'sk',
      items: [
        {
          role: 'main',
          doc: doc(para(text('Žluťoučký kůň'), { type: 'hardBreak' }, text('úpěl ďábelské ódy'))),
          docSchemaV: 1,
          media: [
            {
              sha256: SHA_A,
              transform: { x: 0, y: 125, w: 1000, h: 750 },
              alt: 'Kôň na lúke',
              ai: false,
            },
          ],
        },
        {
          role: 'thread',
          doc: doc(para(text('Druhý príspevok'))),
          docSchemaV: 1,
          media: [],
        },
      ],
      settings: { threadgate: 'everyone', langs: ['sk', 'cs'], quotes: true, maxReplies: 0 },
    };
    expect(contentHashPayload(golden)).toBe(
      '{"account":"0197a5c2-3b4d-7e8f-9a0b-1c2d3e4f5a6b","delivery_mode":"auto","items":[{"doc":{"content":[{"content":[{"text":"Žluťoučký kůň","type":"text"},{"type":"hardBreak"},{"text":"úpěl ďábelské ódy","type":"text"}],"type":"paragraph"}],"type":"doc"},"media":[{"ai":false,"alt":"Kôň na lúke","sha256":"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08","transform":{"h":750,"w":1000,"x":0,"y":125}}],"role":"main"},{"doc":{"content":[{"content":[{"text":"Druhý príspevok","type":"text"}],"type":"paragraph"}],"type":"doc"},"media":[],"role":"thread"}],"language":"sk","provider":"bluesky","publish_type":"post","settings":{"langs":["sk","cs"],"maxReplies":0,"quotes":true,"threadgate":"everyone"},"v":1}',
    );
    expect(await hexOf(golden)).toBe(
      '30950a2167c147db0e2ba6cd10b9c3d2a01fb43a01b174c302d29a852a908c15',
    );
  });
});

describe('toHex', () => {
  it('writes lowercase, zero-padded hex', () => {
    expect(toHex(new Uint8Array([0, 1, 15, 16, 171, 255]))).toBe('00010f10abff');
    expect(toHex(new Uint8Array())).toBe('');
  });
});
