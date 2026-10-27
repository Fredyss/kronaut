import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from './collect.ts';
import { NATIVE_COMPONENTS, renderNative } from './native.ts';

function stageArgs(dockerfile: string, stage: string): Record<string, string> {
  const args: Record<string, string> = {};
  let inStage = false;
  for (const line of dockerfile.split('\n')) {
    if (line.startsWith('FROM ')) inStage = line.endsWith(` AS ${stage}`);
    const match = inStage ? /^ARG (\w+)=(.*)$/.exec(line) : null;
    if (!match?.[1] || match[2] === undefined) continue;
    args[match[1]] = match[2].replace(/\$\{(\w+)\}/g, (_, name: string) => args[name] ?? '');
  }
  return args;
}

describe('native components', () => {
  it('match the pins in the ffmpeg build stage', () => {
    const dockerfile = readFileSync(join(ROOT, 'infra', 'docker', 'Dockerfile'), 'utf8');
    const expected = Object.fromEntries(
      NATIVE_COMPONENTS.flatMap((c) => [
        [c.args.version, c.version],
        [c.args.url, c.url],
        [c.args.sha256, c.sha256],
      ]),
    );
    expect(stageArgs(dockerfile, 'ffmpeg')).toEqual(expected);
  });

  it('renders every component with its source and hash', () => {
    const text = renderNative(NATIVE_COMPONENTS);
    for (const c of NATIVE_COMPONENTS) {
      expect(text).toContain(`${c.name} ${c.version}\nLicense: ${c.license}`);
      expect(text).toContain(`Source: ${c.url}\nSHA-256: ${c.sha256}`);
    }
    expect(text).toContain('built unmodified');
  });
});
