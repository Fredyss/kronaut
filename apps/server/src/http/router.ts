import type { BoundRoute } from './types.ts';

export type RouteMatch =
  | {
      readonly kind: 'found';
      readonly bound: BoundRoute;
      readonly params: Readonly<Record<string, string>>;
    }
  | { readonly kind: 'method_not_allowed'; readonly allow: readonly string[] }
  | { readonly kind: 'not_found' };

interface Entry {
  readonly bound: BoundRoute;
  readonly segments: readonly string[];
}

interface Candidate {
  readonly entry: Entry;
  readonly params: Record<string, string>;
}

const NOT_FOUND: RouteMatch = { kind: 'not_found' };

function split(path: string): readonly string[] {
  return path.split('/').slice(1);
}

function isParam(segment: string): boolean {
  return segment.startsWith(':');
}

function match(entry: Entry, segments: readonly string[]): Record<string, string> | null {
  if (entry.segments.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (const [index, pattern] of entry.segments.entries()) {
    const actual = segments[index] ?? '';
    if (isParam(pattern)) {
      if (actual === '') return null;
      let decoded: string;
      try {
        decoded = decodeURIComponent(actual);
      } catch {
        return null;
      }
      params[pattern.slice(1)] = decoded;
    } else if (pattern !== actual) {
      return null;
    }
  }
  return params;
}

function moreSpecific(a: Entry, b: Entry): boolean {
  for (const [index, segment] of a.segments.entries()) {
    const other = b.segments[index] ?? '';
    if (isParam(segment) !== isParam(other)) return !isParam(segment);
  }
  return false;
}

function candidatesFor(entries: readonly Entry[], segments: readonly string[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const entry of entries) {
    const params = match(entry, segments);
    if (params !== null) candidates.push({ entry, params });
  }
  return candidates;
}

function bestFor(candidates: readonly Candidate[], method: string): Candidate | undefined {
  let best: Candidate | undefined;
  for (const candidate of candidates) {
    if (candidate.entry.bound.route.method !== method) continue;
    if (best === undefined || moreSpecific(candidate.entry, best.entry)) best = candidate;
  }
  return best;
}

export function createRouter(
  routes: readonly BoundRoute[],
): (method: string, path: string) => RouteMatch {
  const entries: Entry[] = routes.map((bound) => ({ bound, segments: split(bound.route.path) }));
  return (method, path) => {
    const segments = split(path);
    const candidates = candidatesFor(entries, segments);
    if (candidates.length === 0) return NOT_FOUND;
    const best = bestFor(candidates, method);
    if (best === undefined) {
      const allow = [...new Set(candidates.map((c) => c.entry.bound.route.method))].sort();
      return { kind: 'method_not_allowed', allow };
    }
    return { kind: 'found', bound: best.entry.bound, params: best.params };
  };
}
