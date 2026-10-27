import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export const ROOT = join(import.meta.dirname, '..', '..');

export type Pkg = {
  name: string;
  version: string;
  license: string;
  path: string;
  homepage: string | undefined;
};

type Row = {
  name: string;
  versions: string[];
  paths: string[];
  license: string;
  homepage?: string;
};

function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function collectPackages(): Pkg[] {
  const out = execFileSync('pnpm', ['-r', 'licenses', 'list', '--prod', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const byLicense = JSON.parse(out) as Record<string, Row[]>;
  const unique = new Map<string, Pkg>();
  for (const [license, rows] of Object.entries(byLicense)) {
    for (const row of rows) {
      if (row.name.startsWith('@kronaut/')) continue;
      row.versions.forEach((version, i) => {
        const path = row.paths[i];
        if (path === undefined) return;
        unique.set(`${row.name}@${version}`, {
          name: row.name,
          version,
          license,
          path,
          homepage: row.homepage,
        });
      });
    }
  }
  return [...unique.values()].sort(
    (a, b) => compare(a.name, b.name) || compare(a.version, b.version),
  );
}
