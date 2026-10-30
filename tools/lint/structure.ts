import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

export type ImportGraph = ReadonlyMap<string, readonly string[]>;

const VALUE_IMPORT = /^(?:import|export)\s+(?!type\b)(?:[^;'"]*?\sfrom\s+)?'([^']+)'/gm;
const GENERATED = /\/paraglide[^/]*\/|\/gen\/|\.gen\.ts$|\.d\.ts$/;
const NOT_SHIPPED = /^apps\/server\/e2e\/|^packages\/db\/test\/|^(apps|packages)\/[^/]+\/scripts\//;

export function isTesting(path: string): boolean {
  return /\.test\.tsx?$|(^|[/-])testing([-.]|$)/.test(path);
}

export function valueImports(source: string): string[] {
  return [...source.matchAll(VALUE_IMPORT)].flatMap((match) => match[1] ?? []);
}

function resolve(file: string, specifier: string): string {
  return specifier.startsWith('.') ? normalize(join(dirname(file), specifier)) : specifier;
}

export function repoImportGraph(root: string): ImportGraph {
  const listed = execFileSync('git', ['ls-files', 'apps', 'packages'], {
    cwd: root,
    encoding: 'utf8',
  });
  const files = listed.split('\n').filter((f) => /\.tsx?$/.test(f) && !GENERATED.test(f));
  return new Map(
    files.map((file) => [
      file,
      valueImports(readFileSync(join(root, file), 'utf8')).map((to) => resolve(file, to)),
    ]),
  );
}

function reachableFrom(graph: ImportGraph, start: string): Set<string> {
  const seen = new Set<string>();
  const pending = [...(graph.get(start) ?? [])];
  for (const file of pending) {
    if (seen.has(file) || !graph.has(file)) continue;
    seen.add(file);
    pending.push(...(graph.get(file) ?? []));
  }
  return seen;
}

export function findCycles(graph: ImportGraph): string[][] {
  const reach = new Map([...graph.keys()].map((file) => [file, reachableFrom(graph, file)]));
  const cycles = new Map<string, string[]>();
  for (const [file, seen] of reach) {
    if (!seen.has(file)) continue;
    const members = [...seen].filter((other) => reach.get(other)?.has(file)).sort();
    cycles.set(members.join(), members);
  }
  return [...cycles.values()];
}

export function testingLeaks(graph: ImportGraph): string[] {
  return [...graph].flatMap(([file, targets]) =>
    isTesting(file) || NOT_SHIPPED.test(file)
      ? []
      : targets.filter(isTesting).map((target) => `${file} -> ${target}`),
  );
}
