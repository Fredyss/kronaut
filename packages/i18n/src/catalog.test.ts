import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile } from '@inlang/paraglide-js';
import { describe, expect, it } from 'vitest';
import * as cs from '#paraglide/messages/cs.js';
import * as sk from '#paraglide/messages/sk.js';
import { PARAGLIDE } from '../i18n.config.ts';

const MESSAGES = new URL('../messages/', import.meta.url);

function keys(locale: string): string[] {
  const catalog = JSON.parse(readFileSync(new URL(`${locale}.json`, MESSAGES), 'utf8')) as object;
  return Object.keys(catalog).sort();
}

function tree(root: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    files.set(full.slice(root.length), readFileSync(full, 'utf8'));
  }
  return files;
}

describe('message catalog', () => {
  it('has every key in every locale and picks sk/cs plural forms', () => {
    expect(keys('sk')).toEqual(keys('en'));
    expect(keys('cs')).toEqual(keys('en'));

    expect([1, 3, 5, 0, 1.5].map((count) => sk.posts_scheduled({ count }))).toEqual([
      '1 naplánovaný príspevok',
      '3 naplánované príspevky',
      '5 naplánovaných príspevkov',
      '0 naplánovaných príspevkov',
      '1.5 naplánovaného príspevku',
    ]);
    expect([1, 4, 12, 2.5].map((count) => cs.posts_scheduled({ count }))).toEqual([
      '1 naplánovaný příspěvek',
      '4 naplánované příspěvky',
      '12 naplánovaných příspěvků',
      '2.5 naplánovaného příspěvku',
    ]);
  });

  it('keeps the committed Paraglide output current', async () => {
    const outdir = mkdtempSync(join(tmpdir(), 'kronaut-paraglide-'));
    try {
      await compile({ ...PARAGLIDE, outdir });
      expect(
        tree(outdir),
        'packages/i18n/src/paraglide is stale: run `pnpm --filter @kronaut/i18n i18n`',
      ).toEqual(tree(PARAGLIDE.outdir));
    } finally {
      rmSync(outdir, { recursive: true, force: true });
    }
  });
});
