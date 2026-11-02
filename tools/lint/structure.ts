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
const DYNAMIC_IMPORT = /\bimport\(\s*(?:'([^']+)'|`([^`$]+)`)\s*\)/g;
const GENERATED = /\/paraglide[^/]*\/|\/gen\/|\.gen\.ts$|\.d\.ts$/;
const NOT_SHIPPED = /^apps\/server\/e2e\/|^packages\/db\/scripts\//;
const FEATURE_FILE = /^apps\/(server|web)\/src\/(([^/]+)\/.+)$/;
const WIRING_FOLDERS = new Set(['server/http', 'web/i18n', 'web/routes']);
const BASE_FOLDERS = new Set(['web/api', 'web/locale', 'web/ui']);
const WEB_ROOT_FILE = /^apps\/web\/src\/[^/]+$/;
const TEST_FILE = /\.test\.tsx?$/;
const WEB_ENTRYPOINTS = new Set(['apps/web/src/app.tsx', 'apps/web/src/main.tsx']);
const CREDENTIAL_PACKAGE = /^(?:packages\/credentials\/|@kronaut\/credentials(?:\/|$))/;
const CREDENTIAL_STORES = /^apps\/server\/src\/credentials\//;
const SERVER_ENTRYPOINTS = new Set(['apps/server/src/start.ts', 'apps/server/src/openapi.ts']);
const KEYRING_USERS = new Set(['server/credentials', 'server/cli']);
const CREDENTIAL_READERS = new Set([
  'server/credentials',
  'server/publish',
  'server/channels',
  'server/analytics',
  'server/meta',
  'server/cli',
]);
const ROUTE_FILE = /[/-]routes\.ts$/;
const SRC_ROOT_TEST = /^apps\/[^/]+\/src\/([^/]+?)(?:\.db)?\.test\.tsx?$/;
const HELPER_NAME = /(^|\/)testing(\.tsx?$|\/)/;

export function isTesting(path: string): boolean {
  return /\.test\.tsx?$|(^|[/._-])testing([-./_]|$)/.test(path);
}

export function valueImports(source: string): string[] {
  return [...source.matchAll(STATIC_IMPORT), ...source.matchAll(DYNAMIC_IMPORT)].flatMap(
    (match) => match[1] ?? match[2] ?? [],
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
      if (source.feature.startsWith('web/') && BASE_FOLDERS.has(target.feature)) continue;
      imports.add(`${source.feature} -> ${target.path}`);
    }
  }
  return [...imports].sort();
}

export function folderCycles(imports: readonly string[], app: string): string[][] {
  const folders = new Map<string, string[]>();
  for (const line of imports) {
    const [source = '', target = ''] = line.split(' -> ');
    const [sourceApp, from] = source.split('/');
    if (sourceApp !== app || from === undefined) continue;
    const to = target.split('/')[0] ?? '';
    folders.set(from, [...(folders.get(from) ?? []), to]);
    if (!folders.has(to)) folders.set(to, []);
  }
  return findCycles(folders);
}

export function baseLeaks(graph: ImportGraph): string[] {
  return [...graph]
    .flatMap(([file, targets]) => {
      const source = featureFile(file);
      if (source === undefined || !BASE_FOLDERS.has(source.feature)) return [];
      return targets
        .filter((target) => {
          if (WEB_ROOT_FILE.test(target)) return true;
          const feature = featureFile(target)?.feature;
          return feature !== undefined && feature !== source.feature && !BASE_FOLDERS.has(feature);
        })
        .map((target) => `${file} -> ${target}`);
    })
    .sort();
}

export function rootFiles(graph: ImportGraph): string[] {
  return [...graph.keys()]
    .filter(
      (file) => WEB_ROOT_FILE.test(file) && !TEST_FILE.test(file) && !WEB_ENTRYPOINTS.has(file),
    )
    .sort();
}

function mayImport(file: string, target: string): boolean {
  const feature = featureFile(file)?.feature ?? '';
  if (CREDENTIAL_PACKAGE.test(target))
    return SERVER_ENTRYPOINTS.has(file) || KEYRING_USERS.has(feature);
  if (CREDENTIAL_STORES.test(target)) return CREDENTIAL_READERS.has(feature);
  return true;
}

export function credentialLeaks(graph: ImportGraph): string[] {
  return [...graph]
    .flatMap(([file, targets]) =>
      isTesting(file) || NOT_SHIPPED.test(file) || file.startsWith('packages/credentials/')
        ? []
        : targets
            .filter((target) => !mayImport(file, target))
            .map((target) => `${file} -> ${target}`),
    )
    .sort();
}

export function routeImports(graph: ImportGraph): string[] {
  return featureImports(graph).filter((line) => ROUTE_FILE.test(line));
}
