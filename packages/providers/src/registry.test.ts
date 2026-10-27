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
});
