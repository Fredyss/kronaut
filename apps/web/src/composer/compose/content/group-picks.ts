import type { Destination } from '../../../records/posts/queries.ts';

export type Sources = ReadonlyMap<string, string>;

export function storedSources(destinations: readonly Destination[]): Sources {
  return new Map(
    destinations.flatMap(({ accountId, sourceGroupId }) =>
      typeof sourceGroupId === 'string' ? [[accountId, sourceGroupId] as const] : [],
    ),
  );
}

export function toggled(
  selected: ReadonlySet<string>,
  ids: readonly string[],
  on: boolean,
): ReadonlySet<string> {
  const next = new Set(selected);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function manualSources(
  sources: Sources,
  selected: ReadonlySet<string>,
  ids: readonly string[],
  on: boolean,
): Sources {
  const next = new Map(sources);
  for (const id of ids) {
    if (!on || !selected.has(id)) next.delete(id);
  }
  return next;
}

export function groupSources(
  sources: Sources,
  selected: ReadonlySet<string>,
  groupId: string,
  ids: readonly string[],
): Sources {
  const next = new Map(sources);
  for (const id of ids) {
    if (!selected.has(id)) next.set(id, groupId);
  }
  return next;
}

export function withoutPicks(sources: Sources, accountIds: readonly string[]): Sources {
  const next = new Map(sources);
  for (const id of accountIds) next.delete(id);
  return next;
}
