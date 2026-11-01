import { describe, expect, it } from 'vitest';
import { decodePublicId, encodePublicId, ID_PREFIXES, type IdKind } from './ids.ts';

const KINDS = Object.keys(ID_PREFIXES) as IdKind[];
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

const VECTORS: readonly (readonly [string, string])[] = [
  ['00000000-0000-0000-0000-000000000000', '00000000000000000000000000'],
  ['00000000-0000-0000-0000-000000000001', '00000000000000000000000001'],
  ['00000000-0000-0000-0000-00000000000a', '0000000000000000000000000a'],
  ['00000000-0000-0000-0000-000000000010', '0000000000000000000000000g'],
  ['ffffffff-ffff-ffff-ffff-ffffffffffff', '7zzzzzzzzzzzzzzzzzzzzzzzzz'],
  ['01890a5d-ac96-774b-bcce-b302099a8057', '01h455vb4pex5vsknk084sn02q'],
];

function referenceSuffix(uuid: string): string {
  const bits = uuid
    .replaceAll('-', '')
    .split('')
    .map((c) => Number.parseInt(c, 16).toString(2).padStart(4, '0'))
    .join('');
  const padded = `00${bits}`;
  let out = '';
  for (let i = 0; i < padded.length; i += 5) {
    out += ALPHABET.charAt(Number.parseInt(padded.slice(i, i + 5), 2));
  }
  return out;
}

function randomUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

describe('ID_PREFIXES', () => {
  it('maps every kind to its prefix', () => {
    expect(ID_PREFIXES).toEqual({
      workspace: 'ws',
      user: 'usr',
      post: 'post',
      destination: 'dest',
      socialAccount: 'acct',
      media: 'media',
      attempt: 'att',
      brand: 'brand',
      location: 'loc',
      group: 'grp',
      campaign: 'camp',
      notification: 'ntf',
      approvalRequest: 'apr',
      grant: 'grant',
      series: 'ser',
      tag: 'tag',
      savedText: 'stx',
      mediaImport: 'mimp',
    });
  });

  it('uses unique prefixes without underscores', () => {
    const prefixes = Object.values(ID_PREFIXES);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const prefix of prefixes) {
      expect(prefix).toMatch(/^[a-z]+$/);
    }
  });
});

describe('encodePublicId', () => {
  it.each(VECTORS)('encodes %s', (uuid, suffix) => {
    expect(encodePublicId('post', uuid)).toBe(`post_${suffix}`);
  });

  it.each(KINDS)('prefixes %s ids', (kind) => {
    const uuid = '01890a5d-ac96-774b-bcce-b302099a8057';
    expect(encodePublicId(kind, uuid)).toBe(`${ID_PREFIXES[kind]}_01h455vb4pex5vsknk084sn02q`);
  });

  it('accepts uppercase hex and encodes it like lowercase', () => {
    expect(encodePublicId('workspace', '01890A5D-AC96-774B-BCCE-B302099A8057')).toBe(
      'ws_01h455vb4pex5vsknk084sn02q',
    );
    expect(encodePublicId('workspace', 'FFFFFFFF-ffff-FFFF-ffff-ffffffffFFFF')).toBe(
      'ws_7zzzzzzzzzzzzzzzzzzzzzzzzz',
    );
  });

  it('always produces a 26 character suffix', () => {
    for (let i = 0; i < 200; i++) {
      const id = encodePublicId('destination', randomUuid());
      expect(id).toMatch(/^dest_[0-7][0-9a-hjkmnp-tv-z]{25}$/);
    }
  });

  it('matches an independent bit-string reference', () => {
    for (let i = 0; i < 500; i++) {
      const uuid = randomUuid();
      expect(encodePublicId('post', uuid)).toBe(`post_${referenceSuffix(uuid)}`);
    }
  });

  it('preserves the sort order of time-ordered uuids', () => {
    const uuids = Array.from({ length: 200 }, randomUuid).sort();
    const ids = uuids.map((uuid) => encodePublicId('post', uuid));
    expect([...ids].sort()).toEqual(ids);
  });

  it.each([
    ['empty', ''],
    ['not a uuid', 'not-a-uuid'],
    ['no hyphens', '01890a5dac96774bbcceb302099a8057'],
    ['too short', '01890a5d-ac96-774b-bcce-b302099a805'],
    ['too long', '01890a5d-ac96-774b-bcce-b302099a80577'],
    ['misplaced hyphens', '01890a5-dac96-774b-bcce-b302099a8057'],
    ['non-hex digit', '01890a5d-ac96-774b-bcce-b302099a805g'],
    ['braces', '{01890a5d-ac96-774b-bcce-b302099a8057}'],
    ['urn prefix', 'urn:uuid:01890a5d-ac96-774b-bcce-b302099a8057'],
    ['leading space', ' 01890a5d-ac96-774b-bcce-b302099a8057'],
    ['trailing newline', '01890a5d-ac96-774b-bcce-b302099a8057\n'],
    ['public id instead of uuid', 'post_01h455vb4pex5vsknk084sn02q'],
  ])('throws a TypeError for %s', (_name, uuid) => {
    expect(() => encodePublicId('post', uuid)).toThrow(TypeError);
  });
});

describe('decodePublicId', () => {
  it.each(VECTORS)('decodes the suffix of %s', (uuid, suffix) => {
    expect(decodePublicId('post', `post_${suffix}`)).toBe(uuid);
  });

  it('round-trips every kind over many uuids', () => {
    for (let i = 0; i < 500; i++) {
      const uuid = randomUuid();
      const kind = KINDS[i % KINDS.length] as IdKind;
      expect(decodePublicId(kind, encodePublicId(kind, uuid))).toBe(uuid);
    }
  });

  it('round-trips crypto.randomUUID values', () => {
    for (let i = 0; i < 200; i++) {
      const v4 = crypto.randomUUID();
      expect(decodePublicId('user', encodePublicId('user', v4))).toBe(v4);
    }
  });

  it('returns lowercase for uppercase input', () => {
    const upper = '01890A5D-AC96-774B-BCCE-B302099A8057';
    expect(decodePublicId('post', encodePublicId('post', upper))).toBe(upper.toLowerCase());
  });

  const valid = 'post_01h455vb4pex5vsknk084sn02q';

  it('accepts the reference id', () => {
    expect(decodePublicId('post', valid)).toBe('01890a5d-ac96-774b-bcce-b302099a8057');
  });

  it.each(KINDS.filter((k) => k !== 'post'))('rejects a post id as %s', (kind) => {
    expect(decodePublicId(kind, valid)).toBeNull();
  });

  it.each([
    ['empty string', ''],
    ['prefix only', 'post_'],
    ['prefix without underscore', 'post01h455vb4pex5vsknk084sn02q'],
    ['hyphen instead of underscore', 'post-01h455vb4pex5vsknk084sn02q'],
    ['doubled underscore', 'post__01h455vb4pex5vsknk084sn02q'],
    ['no prefix', '01h455vb4pex5vsknk084sn02q'],
    ['longer prefix', 'posts_01h455vb4pex5vsknk084sn02q'],
    ['extra leading prefix', 'x_post_01h455vb4pex5vsknk084sn02q'],
    ['uppercase prefix', 'POST_01h455vb4pex5vsknk084sn02q'],
    ['suffix one char short', 'post_01h455vb4pex5vsknk084sn02'],
    ['suffix one char long', 'post_01h455vb4pex5vsknk084sn02qq'],
    ['suffix far too long', `post_${'0'.repeat(52)}`],
    ['uppercase suffix', 'post_01H455VB4PEX5VSKNK084SN02Q'],
    ['one uppercase char', 'post_01h455vb4pex5vsknk084sn02Q'],
    ['letter i', 'post_01h455vb4pex5vsknk084sn02i'],
    ['letter l', 'post_01h455vb4pex5vsknk084sn02l'],
    ['letter o', 'post_01h455vb4pex5vsknk084sn02o'],
    ['letter u', 'post_01h455vb4pex5vsknk084sn02u'],
    ['hyphen in suffix', 'post_01h455vb4pex5vsknk084sn02-'],
    ['space in suffix', 'post_01h455vb4pex5vsknk084sn02 '],
    ['trailing newline', 'post_01h455vb4pex5vsknk084sn02q\n'],
    ['non-ascii char', 'post_01h455vb4pex5vsknk084sn02é'],
    ['surrogate pair', 'post_01h455vb4pex5vsknk084sn0\u{1f600}'],
    ['first char 8', 'post_81h455vb4pex5vsknk084sn02q'],
    ['first char z', 'post_zzzzzzzzzzzzzzzzzzzzzzzzzz'],
    ['first char g', 'post_g1h455vb4pex5vsknk084sn02q'],
  ])('returns null for %s', (_name, value) => {
    expect(decodePublicId('post', value)).toBeNull();
  });

  it('accepts the largest first char', () => {
    expect(decodePublicId('post', 'post_7zzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    );
  });

  it('rejects every first char above 7', () => {
    for (const c of ALPHABET.slice(8)) {
      expect(decodePublicId('post', `post_${c}${'0'.repeat(25)}`)).toBeNull();
    }
  });

  it('accepts every first char up to 7', () => {
    for (const c of ALPHABET.slice(0, 8)) {
      expect(decodePublicId('post', `post_${c}${'0'.repeat(25)}`)).not.toBeNull();
    }
  });
});
