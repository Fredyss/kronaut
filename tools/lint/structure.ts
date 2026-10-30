import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

export type ImportGraph = ReadonlyMap<string, readonly string[]>;

interface PackageJson {
  readonly name: string;
  readonly exports?: Readonly<Record<string, string>>;
}

const STATIC_IMPORT =
  /^(?:import|export)\s+(?!type\b)(?:(?:[\w$]+\s*,?\s*)?(?:\{[^{}]*\}|\*(?:\s+as\s+[\w$]+)?)?\s*from\s+)?'([^']+)'/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*'([^']+)'\s*\)/g;
const GENERATED = /\/paraglide[^/]*\/|\/gen\/|\.gen\.ts$|\.d\.ts$/;
const NOT_SHIPPED = /^apps\/server\/e2e\/|^packages\/db\/scripts\//;
const FEATURE_FILE = /^apps\/(server|web)\/src\/(([^/]+)\/.+)$/;
const WIRING_FOLDERS = new Set(['server/http', 'web/i18n', 'web/routes']);
const SRC_ROOT_TEST = /^apps\/[^/]+\/src\/([^/]+?)(?:\.db)?\.test\.tsx?$/;
const HELPER_NAME = /(^|\/)testing(\.tsx?$|\/)/;

export function isTesting(path: string): boolean {
  return /\.test\.tsx?$|(^|[/-])testing([-./]|$)/.test(path);
}

export function valueImports(source: string): string[] {
  return [...source.matchAll(STATIC_IMPORT), ...source.matchAll(DYNAMIC_IMPORT)].flatMap(
    (match) => match[1] ?? [],
  );
}

function packageEntries(root: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const folder of readdirSync(join(root, 'packages'))) {
    const manifest = join(root, 'packages', folder, 'package.json');
    if (!existsSync(manifest)) continue;
    const { name, exports: targets } = JSON.parse(readFileSync(manifest, 'utf8')) as PackageJson;
    for (const [entry, target] of Object.entries(targets ?? {})) {
      entries.set(`${name}${entry.slice(1)}`, normalize(join('packages', folder, target)));
    }
  }
  return entries;
}

function workspaceSources(root: string): string[] {
  const args = ['ls-files', '--cached', '--others', '--exclude-standard', 'apps', 'packages'];
  const listed = execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  return listed
    .split('\n')
    .filter((f) => /\.tsx?$/.test(f) && !GENERATED.test(f) && existsSync(join(root, f)));
}

export function repoImportGraph(root: string): ImportGraph {
  const entries = packageEntries(root);
  const resolve = (file: string, specifier: string): string =>
    specifier.startsWith('.')
      ? normalize(join(dirname(file), specifier))
      : (entries.get(specifier) ?? specifier);
  return new Map(
    workspaceSources(root).map((file) => [
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

export function misplacedTests(graph: ImportGraph): string[] {
  return [...graph.keys()].filter((file) => {
    const [, subject] = SRC_ROOT_TEST.exec(file) ?? [];
    if (subject !== undefined) {
      const stem = join(dirname(file), subject);
      return !graph.has(`${stem}.ts`) && !graph.has(`${stem}.tsx`);
    }
    return isTesting(file) && !file.includes('.test.') && !HELPER_NAME.test(file);
  });
}

function featureFile(file: string): { feature: string; path: string } | undefined {
  const [, app, path, folder] = FEATURE_FILE.exec(file) ?? [];
  if (path === undefined || isTesting(file)) return undefined;
  return { feature: `${app}/${folder}`, path };
}

export function featureImports(graph: ImportGraph): string[] {
  const imports = new Set<string>();
  for (const [file, targets] of graph) {
    const source = featureFile(file);
    if (source === undefined || WIRING_FOLDERS.has(source.feature)) continue;
    for (const target of targets.map(featureFile)) {
      if (target === undefined || target.feature === source.feature) continue;
      imports.add(`${source.feature} -> ${target.path}`);
    }
  }
  return [...imports].sort();
}
