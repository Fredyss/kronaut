import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = new URL('../../packages/compose/src/tlds.ts', import.meta.url);
const VERSION = /^# Version \d{10}, Last Updated .+ UTC$/;
const LABEL = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

function render(source: string): string {
  const [version = '', ...rest] = source.replace(/\r\n?/g, '\n').trim().split('\n');
  if (!VERSION.test(version)) throw new Error(`not an IANA TLD list: ${version}`);
  const labels = rest.map((line) => line.trim().toLowerCase()).filter((line) => line !== '');
  const invalid = labels.filter((label) => !LABEL.test(label));
  if (invalid.length > 0) throw new Error(`unexpected TLD lines: ${invalid.join(', ')}`);
  if (new Set(labels).size !== labels.length) throw new Error('duplicate TLD lines');
  return [
    `export const TLD_VERSION = '${version.replace(/^# /, '')}';`,
    '',
    'export const TLDS =',
    `  '${labels.join(' ')}';`,
    '',
  ].join('\n');
}

writeFileSync(TARGET, render(readFileSync(0, 'utf8')));
