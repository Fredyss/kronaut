import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { ROUTE_GROUPS } from '@kronaut/i18n/config';
import { describe, expect, it } from 'vitest';

const SRC = resolve(import.meta.dirname, '..');
const MESSAGES = resolve(SRC, '../../../packages/i18n/messages');
const STATIC = /^(?:import|export)(?!\s+type\b)[\s\w{},*]*?['"](\.{1,2}\/[^'"]+)['"]/gm;
const DYNAMIC = /import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const SHELL = 'main.tsx';
const ROUTER = 'app.tsx';

interface Source {
  readonly text: string;
  readonly static: readonly string[];
  readonly dynamic: readonly string[];
}

function targets(file: string, text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) =>
    relative(SRC, resolve(dirname(join(SRC, file)), match[1] ?? '')),
  );
}

function sources(): Map<string, Source> {
  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => /\.tsx?$/.test(file) && !file.includes('.test.'));
  return new Map(
    files.map((file) => {
      const text = readFileSync(join(SRC, file), 'utf8');
      const source = {
        text,
        static: targets(file, text, STATIC),
        dynamic: targets(file, text, DYNAMIC),
      };
      return [file, source];
    }),
  );
}

function closure(graph: ReadonlyMap<string, Source>, root: string): Set<string> {
  const seen = new Set<string>();
  const stack = [root];
  for (let file = stack.pop(); file !== undefined; file = stack.pop()) {
    const source = graph.get(file);
    if (source === undefined || seen.has(file)) continue;
    seen.add(file);
    stack.push(...source.static);
  }
  return seen;
}

function routeGroup(route: string): string {
  const name = /^routes\/(.+)\.tsx$/.exec(route)?.[1] ?? route;
  return ROUTE_GROUPS.find((group) => name === group || name.startsWith(`${group}-`)) ?? route;
}

function addAll(into: Set<string>, labels: Iterable<string>): boolean {
  const before = into.size;
  for (const label of labels) into.add(label);
  return into.size !== before;
}

function spread(
  graph: ReadonlyMap<string, Source>,
  roots: ReadonlyMap<string, Set<string>>,
  owners: Map<string, Set<string>>,
): boolean {
  let changed = false;
  for (const [root, labels] of roots) {
    for (const file of closure(graph, root)) {
      const owner = owners.get(file) ?? new Set<string>();
      owners.set(file, owner);
      changed = addAll(owner, labels) || changed;
    }
  }
  return changed;
}

function inherit(
  graph: ReadonlyMap<string, Source>,
  roots: Map<string, Set<string>>,
  owners: ReadonlyMap<string, Set<string>>,
): boolean {
  let changed = false;
  for (const [file, source] of graph) {
    if (file === ROUTER) continue;
    for (const target of source.dynamic) {
      const labels = roots.get(target) ?? new Set<string>();
      roots.set(target, labels);
      changed = addAll(labels, owners.get(file) ?? []) || changed;
    }
  }
  return changed;
}

function owners(graph: ReadonlyMap<string, Source>): Map<string, Set<string>> {
  const roots = new Map<string, Set<string>>([[SHELL, new Set(['shell'])]]);
  for (const route of graph.get(ROUTER)?.dynamic ?? [])
    roots.set(route, new Set([routeGroup(route)]));
  const result = new Map<string, Set<string>>();
  let changed = true;
  while (changed) changed = spread(graph, roots, result) || inherit(graph, roots, result);
  return result;
}

function groupKeys(group: string): string[] {
  const catalog = JSON.parse(readFileSync(join(MESSAGES, group, 'en.json'), 'utf8')) as object;
  return Object.keys(catalog).filter((key) => key !== '$schema');
}

function only(owner: ReadonlySet<string> | undefined, group: string): boolean {
  return owner?.size === 1 && owner.has(group);
}

const graph = sources();
const owner = owners(graph);

describe('route catalogs', () => {
  it('maps every group to its lazy routes', () => {
    const labels = new Set([...owner.values()].flatMap((labels) => [...labels]));
    expect(ROUTE_GROUPS.filter((group) => !labels.has(group))).toEqual([]);
  });

  it('uses group messages only inside that group', () => {
    const stray = ROUTE_GROUPS.flatMap((group) => {
      const used = new RegExp(`\\.(${groupKeys(group).join('|')})\\b`, 'g');
      return [...owner.keys()]
        .filter((file) => !only(owner.get(file), group))
        .flatMap((file) =>
          [...(graph.get(file)?.text ?? '').matchAll(used)].map((match) => `${file}: ${match[1]}`),
        );
    });
    expect(stray).toEqual([]);
  });

  it('imports a group module only inside that group', () => {
    const stray = [...owner.keys()].flatMap((file) => {
      const source = graph.get(file);
      return [...(source?.static ?? []), ...(source?.dynamic ?? [])]
        .flatMap((target) => /^i18n\/(\w+)\.ts$/.exec(target)?.[1] ?? [])
        .filter((group) => (ROUTE_GROUPS as readonly string[]).includes(group))
        .filter((group) => !only(owner.get(file), group))
        .map((group) => `${file} -> ${group}`);
    });
    expect(stray).toEqual([]);
  });
});
