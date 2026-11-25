import { describe, expect, it } from 'vitest';
import { conformanceProblems } from './_kit/conformance.ts';
import { manifests } from './manifests.ts';
import { runtimes } from './runtime.ts';

describe('provider registry', () => {
  it('pairs every manifest with exactly one runtime', () => {
    const ids = (list: readonly { id: string }[]) => list.map((entry) => entry.id).sort();
    expect(ids(runtimes)).toEqual(ids(manifests));
    expect(new Set(ids(manifests)).size).toBe(manifests.length);
  });

  it('passes the conformance checks for every provider', () => {
    const problems = Object.fromEntries(
      manifests.map((manifest) => {
        const runtime = runtimes.find((entry) => entry.id === manifest.id);
        return [manifest.id, runtime ? conformanceProblems(manifest, runtime) : ['no runtime']];
      }),
    );
    for (const list of Object.values(problems)) expect(list).toEqual([]);
  });

  it('marks only pinterest as manual-only', () => {
    const manualOnly = manifests.filter((manifest) => manifest.manualOnly === true);
    expect(manualOnly.map((manifest) => manifest.id)).toEqual(['pinterest']);
  });

  it('marks only x_com as no-repeats and duplicate-text warning', () => {
    const ids = (flag: 'noRepeats' | 'warnDuplicateText') =>
      manifests.filter((manifest) => manifest[flag] === true).map((manifest) => manifest.id);
    expect(ids('noRepeats')).toEqual(['x_com']);
    expect(ids('warnDuplicateText')).toEqual(['x_com']);
  });
});
