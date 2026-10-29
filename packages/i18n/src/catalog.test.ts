import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile } from '@inlang/paraglide-js';
import { describe, expect, it } from 'vitest';
import * as cs from '#paraglide-calendar/messages/cs.js';
import * as sk from '#paraglide-calendar/messages/sk.js';
import * as cliCs from '#paraglide-cli/messages/cs.js';
import * as cliSk from '#paraglide-cli/messages/sk.js';
import { PARAGLIDE, PARAGLIDE_CLI, PARAGLIDE_GROUPS, ROUTE_GROUPS } from '../i18n.config.ts';

const MESSAGES = new URL('../messages/', import.meta.url);

const PROJECT_DIRS = ['', 'cli/', ...ROUTE_GROUPS.map((group) => `${group}/`)];

function keys(locale: string, dir = ''): string[] {
  const file = new URL(`${dir}${locale}.json`, MESSAGES);
  return Object.keys(JSON.parse(readFileSync(file, 'utf8')) as object)
    .filter((key) => key !== '$schema')
    .sort();
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
    for (const dir of PROJECT_DIRS) {
      expect(keys('sk', dir), dir).toEqual(keys('en', dir));
      expect(keys('cs', dir), dir).toEqual(keys('en', dir));
    }

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
    const tooLong = (messages: typeof cliSk, count: number) =>
      messages.option_too_long({ option: '--name', count });
    expect([1, 3, 5].map((count) => tooLong(cliSk, count))).toEqual([
      'hodnota --name môže mať najviac 1 znak',
      'hodnota --name môže mať najviac 3 znaky',
      'hodnota --name môže mať najviac 5 znakov',
    ]);
    expect([1, 4, 12].map((count) => tooLong(cliCs, count))).toEqual([
      'hodnota --name může mít nejvýše 1 znak',
      'hodnota --name může mít nejvýše 4 znaky',
      'hodnota --name může mít nejvýše 12 znaků',
    ]);
  });

  it('keeps every key in exactly one project', () => {
    const all = PROJECT_DIRS.flatMap((dir) => keys('en', dir));
    expect(all.filter((key, index) => all.indexOf(key) !== index)).toEqual([]);
  });

  it.each([
    ['paraglide', PARAGLIDE],
    ['paraglide-cli', PARAGLIDE_CLI],
    ...ROUTE_GROUPS.map((group) => [`paraglide-${group}`, PARAGLIDE_GROUPS[group]] as const),
  ] as const)('keeps the committed %s output current', async (name, options) => {
    const outdir = mkdtempSync(join(tmpdir(), 'kronaut-paraglide-'));
    try {
      await compile({ ...options, outdir });
      expect(
        tree(outdir),
        `packages/i18n/src/${name} is stale: run \`pnpm --filter @kronaut/i18n i18n\``,
      ).toEqual(tree(options.outdir));
    } finally {
      rmSync(outdir, { recursive: true, force: true });
    }
  });
});
